import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Injectable,
  NotFoundException,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { Factory, FactoryUser } from './factories.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import {
  CreateFactoryDto,
  AssignFactoryMemberDto,
  UpdateFactoryDto,
  UpdateFactoryUserDto,
} from './factories.dto';
import { USER_ROLE } from '../users/users.constants';
import { User } from '../users/users.schema';
import { MessagingService } from 'src/core/messaging/messaging.service';

@Injectable()
export class FactoryService {
  private readonly factoryModel: typeof Factory;
  private readonly factoryUserModel: typeof FactoryUser;
  private readonly userModel: typeof User;
  constructor(
    private readonly dbService: DbService,
    private readonly messagingService: MessagingService,
  ) {
    this.factoryModel = this.dbService.sqlService.Factory;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
    this.userModel = this.dbService.sqlService.User;
  }

  async createFactory(dto: CreateFactoryDto): Promise<Factory> {
    return this.factoryModel.create(dto as any);
  }

  async getAllFactories(): Promise<Factory[]> {
    return this.factoryModel.findAll({
      include: [{ model: FactoryUser, as: 'members' }],
      order: [['id', 'DESC']],
    });
  }

  async getFactoryById(id: number): Promise<Factory> {
    const factory = await this.factoryModel.findByPk(id, {
      include: [{ model: FactoryUser, as: 'members' }],
    });

    if (!factory) throw new NotFoundException('Factory not found');
    return factory;
  }

  async updateFactory(id: number, dto: UpdateFactoryDto): Promise<Factory> {
    const factory = await this.factoryModel.findByPk(id);
    if (!factory) throw new NotFoundException('Factory not found');
    await factory.update(dto as any);
    return factory;
  }

  async deleteFactory(id: number): Promise<{ message: string }> {
    const factory = await this.factoryModel.findByPk(id);
    if (!factory) throw new NotFoundException('Factory not found');
    await this.factoryUserModel.destroy({ where: { factory_id: id } });
    await factory.destroy();
    return { message: 'Factory deleted' };
  }

  async assignMember(dto: AssignFactoryMemberDto): Promise<FactoryUser> {
    const factoryId = Number(dto.factory_id);
    if (!Number.isFinite(factoryId)) {
      throw new BadRequestException('Invalid factory_id');
    }

    const factory = await this.factoryModel.findByPk(factoryId);
    if (!factory) throw new NotFoundException('Factory not found');

    const userIdStr = dto.user_id?.trim();
    const phoneStr = dto.phone_number?.trim();
    const hasUserId = !!userIdStr;
    const hasPhone = !!phoneStr;

    if (hasUserId === hasPhone) {
      throw new BadRequestException(
        'Provide either user_id (existing user) or phone_number (new user), not both',
      );
    }

    const sequelize = this.factoryUserModel.sequelize!;

    if (hasUserId) {
      const userId = Number(userIdStr);
      if (!Number.isFinite(userId)) {
        throw new BadRequestException('Invalid user_id');
      }
      return sequelize.transaction(async (transaction) => {
        const user = await this.userModel.findByPk(userId, { transaction });
        if (!user) throw new NotFoundException('User not found');

        const existingLink = await this.factoryUserModel.findOne({
          where: { user_id: userId },
          transaction,
        });
        if (existingLink) {
          if (existingLink.factory_id === factoryId) {
            throw new BadRequestException(
              'User is already a member of this factory',
            );
          }
          throw new BadRequestException(
            'User is already assigned to another factory',
          );
        }

        return this.factoryUserModel.create(
          { user_id: userId, factory_id: factoryId, role: dto.role } as any,
          { transaction },
        );
      });
    }

    return sequelize
      .transaction(async (transaction) => {
        const existingUser = await this.userModel.findOne({
          where: { phone_number: phoneStr },
          transaction,
        });
        if (existingUser) {
          throw new BadRequestException(
            'A user with this phone already exists. Use "Existing user" to assign them.',
          );
        }

        const user = await this.userModel.create(
          {
            phone_number: phoneStr,
            name: dto.name?.trim() || undefined,
          } as any,
          { transaction },
        );

        return this.factoryUserModel.create(
          {
            user_id: user.id,
            factory_id: factoryId,
            role: dto.role,
          } as any,
          { transaction },
        );
      })
      .then((link) => {
        this.messagingService.fireAndForget(
          (async () => {
            const user = await this.userModel.findByPk(link.user_id, {
              attributes: ['name', 'phone_number'],
            });
            const factoryName =
              await this.messagingService.getFactoryName(factoryId);
            const text = this.messagingService.buildNewUserOnboardedText({
              factoryName,
              userName: user?.name || 'New member',
              userPhone: user?.phone_number || '',
              role: dto.role,
            });
            await this.messagingService.broadcastToOwnersManagers(
              factoryId,
              text,
            );

            const phone = user?.phone_number?.trim();
            if (phone) {
              const templateName =
                process.env.WHATSAPP_ONBOARDING_TEMPLATE?.trim() ||
                'onboarding_message';
              try {
                await this.messagingService.sendTemplate(phone, templateName, {
                  languageCode: 'en',
                });
              } catch {
                /* logged in sendTemplate */
              }
            }
          })(),
          'user-onboarded',
        );
        return link;
      });
  }

  async updateFactoryUser(
    id: number,
    dto: UpdateFactoryUserDto,
  ): Promise<FactoryUser> {
    const link = await this.factoryUserModel.findByPk(id);
    if (!link) throw new NotFoundException('Factory member link not found');
    await link.update(dto as any);
    return link;
  }

  async removeFactoryUser(id: number): Promise<{ message: string }> {
    const link = await this.factoryUserModel.findByPk(id);
    if (!link) throw new NotFoundException('Factory member link not found');
    await link.destroy();
    return { message: 'Member removed from factory' };
  }

  async getAllWorkers() {
    return this.factoryUserModel.findAll({
      where: {
        role: USER_ROLE.WORKER,
      },
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      attributes: ['id', 'user_id', 'factory_id', 'role'],
    });
  }

  async getFactoryUsers(factory_id: number) {
    return this.factoryUserModel.findAll({
      where: {
        factory_id,
      },
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      raw: true,
      nest: true,
    });
  }
}

@Controller('factories')
export class FactoryController {
  constructor(private readonly factoryService: FactoryService) {}

  @Post()
  createFactory(@Body() dto: CreateFactoryDto) {
    return this.factoryService.createFactory(dto);
  }

  @Get()
  getAllFactories() {
    return this.factoryService.getAllFactories();
  }

  @Post('assign-user')
  assignMember(@Body() dto: AssignFactoryMemberDto) {
    return this.factoryService.assignMember(dto);
  }

  @Get(':id')
  getFactory(@Param('id', ParseIntPipe) id: number) {
    return this.factoryService.getFactoryById(id);
  }

  @Patch(':id')
  updateFactory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFactoryDto,
  ) {
    return this.factoryService.updateFactory(id, dto);
  }

  @Delete(':id')
  deleteFactory(@Param('id', ParseIntPipe) id: number) {
    return this.factoryService.deleteFactory(id);
  }

  @Patch('members/:id')
  updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFactoryUserDto,
  ) {
    return this.factoryService.updateFactoryUser(id, dto);
  }

  @Delete('members/:id')
  removeMember(@Param('id', ParseIntPipe) id: number) {
    return this.factoryService.removeFactoryUser(id);
  }

  @Get(':id/users')
  getFactoryUsers(@Param('id', ParseIntPipe) factoryId: number) {
    return this.factoryService.getFactoryUsers(factoryId);
  }
}
