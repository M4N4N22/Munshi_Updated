import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { Department, DepartmentWorker } from './departments.schema';
import { Factory, FactoryUser } from '../factories/factories.schema';
import { User } from '../users/users.schema';
import { Task } from '../tasks/tasks.schema';
import { USER_ROLE } from '../users/users.constants';
import {
  AddDepartmentWorkerDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './departments.dto';
import { looksLikeDepartmentInput } from 'src/services/workflow/worker-onboarding.validation';
import { Op } from 'sequelize';

@Injectable()
export class DepartmentsService {
  private readonly departmentModel: typeof Department;
  private readonly departmentWorkerModel: typeof DepartmentWorker;
  private readonly factoryModel: typeof Factory;
  private readonly factoryUserModel: typeof FactoryUser;
  private readonly userModel: typeof User;
  private readonly taskModel: typeof Task;

  constructor(private readonly dbService: DbService) {
    this.departmentModel = this.dbService.sqlService.Department;
    this.departmentWorkerModel = this.dbService.sqlService.DepartmentWorker;
    this.factoryModel = this.dbService.sqlService.Factory;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
    this.userModel = this.dbService.sqlService.User;
    this.taskModel = this.dbService.sqlService.Task;
  }

  normalizeSlug(slug: string): string {
    return String(slug)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');
  }

  private async getFactoryRole(
    userId: number,
    factoryId: number,
  ): Promise<USER_ROLE | null> {
    const link = await this.factoryUserModel.findOne({
      where: { user_id: userId, factory_id: factoryId },
    });
    return (link?.role as USER_ROLE) ?? null;
  }

  /**
   * Managers may head only one department; owners may head many (interim until handoff).
   */
  private async assertSingleDepartmentHeadUnlessOwner(
    factoryId: number,
    headUserId: number,
    excludeDepartmentId?: number | null,
  ): Promise<void> {
    const role = await this.getFactoryRole(headUserId, factoryId);
    if (role === USER_ROLE.OWNER) {
      return;
    }

    const where: Record<string, unknown> = {
      factory_id: factoryId,
      manager_user_id: headUserId,
    };
    if (excludeDepartmentId != null) {
      where.id = { [Op.ne]: excludeDepartmentId };
    }

    const dup = await this.departmentModel.findOne({ where });
    if (dup) {
      throw new BadRequestException(
        'This manager already heads another department in the factory',
      );
    }
  }

  async resolveManagerUserIdForSlug(
    factoryId: number,
    slug: string,
  ): Promise<number> {
    const normalized = this.normalizeSlug(slug);
    if (!normalized) {
      throw new NotFoundException('Unknown department');
    }
    const row = await this.departmentModel.findOne({
      where: { factory_id: factoryId, slug: normalized },
    });
    if (!row) {
      throw new NotFoundException(`No department matches "${slug}"`);
    }
    return row.manager_user_id;
  }

  /** Full row when resolving department-scoped routing (owner NL → dept manager). */
  async findDepartmentBySlug(factoryId: number, slug: string) {
    const normalized = this.normalizeSlug(slug);
    if (!normalized) return null;
    return this.departmentModel.findOne({
      where: { factory_id: factoryId, slug: normalized },
    });
  }

  /** Department headed by this manager in this factory, if any. */
  async getDepartmentForManager(managerUserId: number, factoryId: number) {
    return this.departmentModel.findOne({
      where: { factory_id: factoryId, manager_user_id: managerUserId },
    });
  }

  async assertManagerCanAssignWorker(
    managerUserId: number,
    factoryId: number,
    workerUserId: number,
  ): Promise<void> {
    const allowed = await this.getAssignableWorkerUserIdsForManager(
      managerUserId,
      factoryId,
    );
    if (!allowed.includes(workerUserId)) {
      throw new BadRequestException(
        'You can only assign tasks to workers in your department or workers not assigned to any department',
      );
    }
  }

  /** User ids allowed as assignee when `assigned_by` creates/updates a task (dashboard / API). */
  async getEligibleAssigneeUserIds(
    factoryId: number,
    assignedByUserId: number,
  ): Promise<number[]> {
    const assignerRole = await this.getFactoryRole(
      assignedByUserId,
      factoryId,
    );
    const members = await this.factoryUserModel.findAll({
      where: { factory_id: factoryId },
      attributes: ['user_id', 'role'],
      raw: true,
    });

    if (assignerRole === USER_ROLE.OWNER) {
      return members.map((m: any) => m.user_id);
    }

    if (assignerRole === USER_ROLE.MANAGER) {
      const workers = members.filter(
        (m: any) => m.role === USER_ROLE.WORKER,
      ) as { user_id: number }[];
      const allowed = new Set(
        await this.getAssignableWorkerUserIdsForManager(
          assignedByUserId,
          factoryId,
        ),
      );
      return workers.filter((w) => allowed.has(w.user_id)).map((w) => w.user_id);
    }

    return [];
  }

  /** Infer task.department_id after assignment rule chosen. */
  async resolveDepartmentIdForNewTask(params: {
    factoryId: number;
    assignedBy: number;
    assigneeUserId: number;
    slugDepartmentId?: number | null;
  }): Promise<number | null> {
    if (params.slugDepartmentId != null) {
      return params.slugDepartmentId;
    }
    const assigneeRole = await this.getFactoryRole(
      params.assigneeUserId,
      params.factoryId,
    );
    if (assigneeRole === USER_ROLE.MANAGER) {
      const d = await this.getDepartmentForManager(
        params.assigneeUserId,
        params.factoryId,
      );
      return d?.id ?? null;
    }
    const assignerDept = await this.getDepartmentForManager(
      params.assignedBy,
      params.factoryId,
    );
    if (assignerDept && assigneeRole === USER_ROLE.WORKER) {
      const link = await this.departmentWorkerModel.findOne({
        where: {
          department_id: assignerDept.id,
          user_id: params.assigneeUserId,
        },
      });
      if (link) return assignerDept.id;
    }
    return null;
  }

  /** First department for new businesses (owner as head). Idempotent. */
  async ensureDefaultDepartment(
    factoryId: number,
    ownerUserId: number,
  ): Promise<Department> {
    const existing = await this.departmentModel.findOne({
      where: { factory_id: factoryId },
      order: [['id', 'ASC']],
    });
    if (existing) {
      return existing;
    }

    return this.create({
      factory_id: factoryId,
      name: 'General',
      slug: 'general',
      manager_user_id: ownerUserId,
    });
  }

  /**
   * Match an existing department by name/slug, or create one (owner as head).
   */
  async findDepartmentHeadedByUser(
    factoryId: number,
    userId: number,
  ): Promise<Department | null> {
    return this.departmentModel.findOne({
      where: { factory_id: factoryId, manager_user_id: userId },
    });
  }

  async findOrCreateByName(
    factoryId: number,
    rawName: string,
    headUserId: number,
  ): Promise<Department> {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!name) {
      throw new BadRequestException('Department name is required');
    }
    if (!looksLikeDepartmentInput(name)) {
      throw new BadRequestException(
        'Team ka naam likhein (jaise sales, production) — sirf numbers nahi.',
      );
    }

    const departments = await this.listByFactory(factoryId);
    const lower = name.toLowerCase();
    const byName = departments.find(
      (d) => d.name.trim().toLowerCase() === lower,
    );
    if (byName) {
      return byName;
    }

    const headRole = await this.getFactoryRole(headUserId, factoryId);
    if (headRole !== USER_ROLE.OWNER) {
      throw new BadRequestException(
        'Nayi team sirf business owner bana sakte hain. List se team chunein.',
      );
    }

    const slugBase = this.normalizeSlug(name) || 'team';
    let slug = slugBase;
    let suffix = 2;
    while (
      await this.departmentModel.findOne({
        where: { factory_id: factoryId, slug },
      })
    ) {
      slug = `${slugBase}-${suffix}`;
      suffix += 1;
    }

    return this.create({
      factory_id: factoryId,
      name,
      slug,
      manager_user_id: headUserId,
    });
  }

  async listByFactory(factoryId: number) {
    return this.departmentModel.findAll({
      where: { factory_id: factoryId },
      include: [
        {
          model: this.userModel,
          as: 'manager',
          attributes: ['id', 'name', 'phone_number'],
        },
        {
          model: this.departmentWorkerModel,
          as: 'department_workers',
          include: [
            {
              model: this.userModel,
              as: 'user',
              attributes: ['id', 'name', 'phone_number'],
            },
          ],
        },
      ],
      order: [['id', 'ASC']],
    });
  }

  async create(dto: CreateDepartmentDto) {
    const factory = await this.factoryModel.findByPk(dto.factory_id);
    if (!factory) throw new NotFoundException('Factory not found');

    const slug = this.normalizeSlug(dto.slug);
    if (!slug) throw new BadRequestException('Invalid department slug');

    const managerRole = await this.getFactoryRole(
      dto.manager_user_id,
      dto.factory_id,
    );
    if (managerRole !== USER_ROLE.MANAGER && managerRole !== USER_ROLE.OWNER) {
      throw new BadRequestException(
        'Department head must be the business owner or a manager in this factory',
      );
    }

    const dupSlug = await this.departmentModel.findOne({
      where: { factory_id: dto.factory_id, slug },
    });
    if (dupSlug) throw new BadRequestException('Slug already used in factory');

    await this.assertSingleDepartmentHeadUnlessOwner(
      dto.factory_id,
      dto.manager_user_id,
    );

    return this.departmentModel.create({
      factory_id: dto.factory_id,
      name: dto.name.trim(),
      slug,
      manager_user_id: dto.manager_user_id,
    } as any);
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const row = await this.departmentModel.findByPk(id);
    if (!row) throw new NotFoundException('Department not found');

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);
      if (!slug) throw new BadRequestException('Invalid department slug');
      const dup = await this.departmentModel.findOne({
        where: {
          factory_id: row.factory_id,
          slug,
          id: { [Op.ne]: id },
        },
      });
      if (dup) throw new BadRequestException('Slug already used in factory');
      patch.slug = slug;
    }
    if (dto.manager_user_id !== undefined) {
      const managerRole = await this.getFactoryRole(
        dto.manager_user_id,
        row.factory_id,
      );
      if (managerRole !== USER_ROLE.MANAGER && managerRole !== USER_ROLE.OWNER) {
        throw new BadRequestException(
          'Department head must be the business owner or a manager in this factory',
        );
      }
      await this.assertSingleDepartmentHeadUnlessOwner(
        row.factory_id,
        dto.manager_user_id,
        id,
      );
      patch.manager_user_id = dto.manager_user_id;
    }

    await row.update(patch as any);
    return row;
  }

  async remove(id: number) {
    const row = await this.departmentModel.findByPk(id);
    if (!row) throw new NotFoundException('Department not found');
    await this.taskModel.update(
      { department_id: null } as any,
      { where: { department_id: id } },
    );
    await this.departmentWorkerModel.destroy({
      where: { department_id: id },
    });
    await row.destroy();
    return { message: 'Department deleted' };
  }

  /** Set department head (manager handoff from owner). Owners may head multiple depts. */
  async assignDepartmentHead(
    departmentId: number,
    headUserId: number,
    factoryId: number,
  ): Promise<Department> {
    const dept = await this.departmentModel.findByPk(departmentId);
    if (!dept) {
      throw new NotFoundException('Department not found');
    }
    if (dept.factory_id !== factoryId) {
      throw new BadRequestException('Department does not belong to this factory');
    }

    const headRole = await this.getFactoryRole(headUserId, factoryId);
    if (headRole !== USER_ROLE.MANAGER && headRole !== USER_ROLE.OWNER) {
      throw new BadRequestException(
        'Department head must be the business owner or a manager in this factory',
      );
    }

    await this.assertSingleDepartmentHeadUnlessOwner(
      factoryId,
      headUserId,
      departmentId,
    );

    await dept.update({ manager_user_id: headUserId } as any);
    return dept;
  }

  async addWorker(departmentId: number, dto: AddDepartmentWorkerDto) {
    const dept = await this.departmentModel.findByPk(departmentId);
    if (!dept) throw new NotFoundException('Department not found');

    const workerRole = await this.getFactoryRole(dto.user_id, dept.factory_id);
    if (workerRole !== USER_ROLE.WORKER) {
      throw new BadRequestException(
        'Only factory workers can be attached to a department',
      );
    }

    const other = await this.departmentWorkerModel.findOne({
      where: { user_id: dto.user_id },
    });
    if (other && other.department_id !== departmentId) {
      throw new BadRequestException(
        'User is already attached to another department',
      );
    }
    if (other) {
      return other;
    }

    return this.departmentWorkerModel.create({
      department_id: departmentId,
      user_id: dto.user_id,
    } as any);
  }

  async removeWorker(departmentId: number, userId: number) {
    const n = await this.departmentWorkerModel.destroy({
      where: { department_id: departmentId, user_id: userId },
    });
    if (!n) throw new NotFoundException('Worker not in this department');
    return { message: 'Worker removed from department' };
  }

  /** Workers user_ids for manager's department (empty if manager has no dept — caller uses all workers). */
  async getWorkerUserIdsInManagerDepartment(
    managerUserId: number,
    factoryId: number,
  ): Promise<number[] | null> {
    const dept = await this.getDepartmentForManager(managerUserId, factoryId);
    if (!dept) return null;
    const rows = await this.departmentWorkerModel.findAll({
      where: { department_id: dept.id },
      attributes: ['user_id'],
      raw: true,
    });
    return rows.map((r: any) => r.user_id);
  }

  /** Workers a department manager may assign: in their department plus workers not in any department (this factory). */
  async getAssignableWorkerUserIdsForManager(
    managerUserId: number,
    factoryId: number,
  ): Promise<number[]> {
    const allRows = await this.factoryUserModel.findAll({
      where: { factory_id: factoryId, role: USER_ROLE.WORKER },
      attributes: ['user_id'],
      raw: true,
    });
    const allWorkerIds = allRows.map((r: any) => r.user_id as number);

    const managerDept = await this.getDepartmentForManager(
      managerUserId,
      factoryId,
    );
    if (!managerDept) {
      return allWorkerIds;
    }

    const inMyDeptRows = await this.departmentWorkerModel.findAll({
      where: { department_id: managerDept.id },
      attributes: ['user_id'],
      raw: true,
    });
    const inMyDept = new Set(
      inMyDeptRows.map((r: any) => r.user_id as number),
    );

    const factoryDeptRows = await this.departmentModel.findAll({
      where: { factory_id: factoryId },
      attributes: ['id'],
      raw: true,
    });
    const factoryDeptIds = factoryDeptRows.map((r: any) => r.id as number);

    let inAnyFactoryDept = new Set<number>();
    if (factoryDeptIds.length > 0) {
      const linked = await this.departmentWorkerModel.findAll({
        where: { department_id: { [Op.in]: factoryDeptIds } },
        attributes: ['user_id'],
        raw: true,
      });
      inAnyFactoryDept = new Set(
        linked.map((r: any) => r.user_id as number),
      );
    }

    return allWorkerIds.filter(
      (uid) => inMyDept.has(uid) || !inAnyFactoryDept.has(uid),
    );
  }

  /** Workers a manager may delegate to, with department label for WhatsApp prompts. */
  async listAssignableWorkersForManager(
    managerUserId: number,
    factoryId: number,
  ): Promise<
    {
      id: number;
      name: string;
      phone_number: string | null;
      departmentName: string | null;
    }[]
  > {
    const ids = await this.getAssignableWorkerUserIdsForManager(
      managerUserId,
      factoryId,
    );
    if (ids.length === 0) return [];

    const users = await this.userModel.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'name', 'phone_number'],
      order: [['name', 'ASC']],
    });

    const links = await this.departmentWorkerModel.findAll({
      where: { user_id: { [Op.in]: ids } },
      include: [
        {
          model: this.departmentModel,
          as: 'department',
          attributes: ['name'],
        },
      ],
    });

    const deptNameByUserId = new Map<number, string>();
    for (const link of links as any[]) {
      if (link.department?.name) {
        deptNameByUserId.set(link.user_id, link.department.name);
      }
    }

    return users.map((u) => ({
      id: u.id,
      name: (u.name || `User #${u.id}`).trim(),
      phone_number: u.phone_number ?? null,
      departmentName: deptNameByUserId.get(u.id) ?? null,
    }));
  }
}

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  list(@Query('factory_id', ParseIntPipe) factoryId: number) {
    return this.departmentsService.listByFactory(factoryId);
  }

  @Get('eligible-assignees')
  eligibleAssignees(
    @Query('factory_id', ParseIntPipe) factoryId: number,
    @Query('assigned_by_user_id', ParseIntPipe) assignedByUserId: number,
  ) {
    return this.departmentsService.getEligibleAssigneeUserIds(
      factoryId,
      assignedByUserId,
    );
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.remove(id);
  }

  @Post(':id/workers')
  addWorker(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddDepartmentWorkerDto,
  ) {
    return this.departmentsService.addWorker(id, dto);
  }

  @Delete(':id/workers/:userId')
  removeWorker(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.departmentsService.removeWorker(id, userId);
  }
}
