import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Injectable,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { User } from './users.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import { FactoryUser } from '../factories/factories.schema';
import { Task, TaskUpdate } from '../tasks/tasks.schema';
import { Issue } from '../issues/issues.schema';
import { Attendance } from '../attendance/attendance.schema';
import {
  Department,
  DepartmentWorker,
} from '../departments/departments.schema';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { Op, Transaction } from 'sequelize';

@Injectable()
export class UserService {
  private readonly userModel: typeof User;
  private readonly factoryUserModel: typeof FactoryUser;
  private readonly taskModel: typeof Task;
  private readonly taskUpdateModel: typeof TaskUpdate;
  private readonly issueModel: typeof Issue;
  private readonly attendanceModel: typeof Attendance;
  private readonly departmentModel: typeof Department;
  private readonly departmentWorkerModel: typeof DepartmentWorker;

  constructor(private readonly dbService: DbService) {
    this.userModel = this.dbService.sqlService.User;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
    this.taskModel = this.dbService.sqlService.Task;
    this.taskUpdateModel = this.dbService.sqlService.TaskUpdate;
    this.issueModel = this.dbService.sqlService.Issue;
    this.attendanceModel = this.dbService.sqlService.Attendance;
    this.departmentModel = this.dbService.sqlService.Department;
    this.departmentWorkerModel = this.dbService.sqlService.DepartmentWorker;
  }

  async create(dto: CreateUserDto): Promise<User> {
    return this.userModel.create(dto as any);
  }

  async findAll(opts?: {
    search?: string;
    factory_id?: number;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.page_size) || 25));

    const where: any = {};
    if (opts?.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${opts.search}%` } },
        { phone_number: { [Op.like]: `%${opts.search}%` } },
      ];
    }

    const include: any[] = [
      {
        model: this.factoryUserModel,
        as: 'factory_links',
        attributes: ['factory_id', 'role', 'doj'],
        ...(opts?.factory_id
          ? { where: { factory_id: opts.factory_id }, required: true }
          : {}),
      },
    ];

    const { rows, count } = await this.userModel.findAndCountAll({
      where,
      include,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['id', 'DESC']],
      distinct: true,
    });

    return {
      data: rows,
      meta: { total: count, page, page_size: pageSize },
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userModel.findByPk(id, {
      include: [
        {
          model: this.factoryUserModel,
          as: 'factory_links',
          attributes: ['factory_id', 'role', 'doj'],
        },
      ],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string) {
    const user = await this.userModel.findOne({
      where: { phone_number: phone },
      include: [
        {
          model: this.factoryUserModel,
          as: 'factory_links',
          attributes: ['factory_id', 'role', 'doj'],
        },
      ],
    });
    return user?.toJSON() as User & { factory_links: FactoryUser };
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) throw new NotFoundException('User not found');
    await user.update(dto as any);
    return user;
  }

  /** Deletes the user and all rows that reference them — single DB transaction (rollback on any failure). */
  async remove(id: number): Promise<{ message: string }> {
    const sequelize = this.userModel.sequelize!;

    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
      async (transaction) => {
        const user = await this.userModel.findByPk(id, {
          transaction,
          lock: Transaction.LOCK.UPDATE,
        });
        if (!user) throw new NotFoundException('User not found');

        await this.departmentWorkerModel.destroy({
          where: { user_id: id },
          transaction,
        });

        const managedDepts = await this.departmentModel.findAll({
          where: { manager_user_id: id },
          attributes: ['id'],
          transaction,
        });
        const managedIds = managedDepts.map((d) => d.id);
        if (managedIds.length) {
          await this.taskModel.update(
            { department_id: null } as any,
            {
              where: { department_id: { [Op.in]: managedIds } },
              transaction,
            },
          );
        }
        for (const d of managedDepts) {
          await this.departmentWorkerModel.destroy({
            where: { department_id: d.id },
            transaction,
          });
          await this.departmentModel.destroy({
            where: { id: d.id },
            transaction,
          });
        }

        await this.taskUpdateModel.destroy({
          where: { user_id: id },
          transaction,
        });

        const relatedTasks = await this.taskModel.findAll({
          where: {
            [Op.or]: [
              { assigned_to: id },
              { assigned_by: id },
              { owner_id: id },
            ],
          },
          attributes: ['id'],
          transaction,
        });
        const taskIds = relatedTasks.map((t) => t.id);
        if (taskIds.length > 0) {
          await this.taskUpdateModel.destroy({
            where: { task_id: { [Op.in]: taskIds } },
            transaction,
          });
          await this.taskModel.destroy({
            where: { id: { [Op.in]: taskIds } },
            transaction,
          });
        }

        await this.issueModel.destroy({
          where: { reported_by: id },
          transaction,
        });

        await this.attendanceModel.destroy({
          where: { user_id: id },
          transaction,
        });

        await this.factoryUserModel.destroy({
          where: { user_id: id },
          transaction,
        });

        await user.destroy({ transaction });
      },
    );

    return { message: 'User deleted' };
  }
}

//
// ✅ CONTROLLER
//

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('factory_id') factory_id?: string,
    @Query('page') page?: string,
    @Query('page_size') page_size?: string,
  ) {
    return this.userService.findAll({
      search,
      factory_id: factory_id ? Number(factory_id) : undefined,
      page: page ? Number(page) : undefined,
      page_size: page_size ? Number(page_size) : undefined,
    });
  }

  @Get('by-phone')
  findByPhone(@Query('phone') phone: string) {
    return this.userService.findByPhone(phone);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
