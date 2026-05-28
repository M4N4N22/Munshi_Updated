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
import { Issue } from './issues.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import { CreateIssueDto, UpdateIssueDto } from './issues.dto';
import { MessagingService } from 'src/core/messaging/messaging.service';

@Injectable()
export class IssueService {
  private readonly IssueModel: typeof Issue;

  constructor(
    private readonly dbService: DbService,
    private readonly messagingService: MessagingService,
  ) {
    this.IssueModel = this.dbService.sqlService.Issue;
  }

  async createIssue(userId: number, factory_id: number, message: string) {
    const issue = await this.IssueModel.create({
      reported_by: userId,
      factory_id,
      message,
    });

    this.messagingService.fireAndForget(
      (async () => {
        const reporter = await this.dbService.sqlService.User.findByPk(
          userId,
          { attributes: ['name'] },
        );
        const factoryName =
          await this.messagingService.getFactoryName(factory_id);
        const text = this.messagingService.buildIssueReportedText({
          factoryName,
          reporterName: reporter?.name || 'User',
          issueId: issue.id,
          message,
        });
        await this.messagingService.broadcastToOwnersManagers(
          factory_id,
          text,
        );
      })(),
      'issue-opened',
    );

    return issue;
  }

  async create(dto: CreateIssueDto) {
    return this.createIssue(dto.reported_by, dto.factory_id, dto.message);
  }

  async resolveIssue(issueId: string | number) {
    const issue = await this.IssueModel.findByPk(issueId);

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    if (issue.is_resolved)
      throw new BadRequestException('This issue is already resolved');

    const snapshot = {
      factory_id: issue.factory_id,
      id: issue.id,
      message: issue.message,
    };

    await issue.update({ is_resolved: true });

    this.messagingService.fireAndForget(
      (async () => {
        const factoryName = await this.messagingService.getFactoryName(
          snapshot.factory_id,
        );
        const text = this.messagingService.buildIssueResolvedText({
          factoryName,
          issueId: snapshot.id,
          message: snapshot.message,
        });
        await this.messagingService.broadcastToOwnersManagers(
          snapshot.factory_id,
          text,
        );
      })(),
      'issue-resolved',
    );

    return { message: 'Issue resolved' };
  }

  async getActiveIssues(factory_id: number) {
    return this.IssueModel.findAll({
      where: {
        factory_id,
        is_resolved: false,
      },
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'reporter',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async findAll(opts: {
    factory_id?: number;
    is_resolved?: boolean;
  }) {
    const where: any = {};
    if (opts.factory_id) where.factory_id = opts.factory_id;
    if (typeof opts.is_resolved === 'boolean')
      where.is_resolved = opts.is_resolved;

    return this.IssueModel.findAll({
      where,
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'reporter',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async findOne(id: number) {
    const issue = await this.IssueModel.findByPk(id, {
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'reporter',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  async update(id: number, dto: UpdateIssueDto) {
    const issue = await this.IssueModel.findByPk(id);
    if (!issue) throw new NotFoundException('Issue not found');
    const becomesResolved =
      dto.is_resolved === true && !issue.is_resolved;
    const snapshot = becomesResolved
      ? {
          factory_id: issue.factory_id,
          id: issue.id,
          message: issue.message,
        }
      : null;

    await issue.update(dto as any);

    if (snapshot) {
      this.messagingService.fireAndForget(
        (async () => {
          const factoryName = await this.messagingService.getFactoryName(
            snapshot.factory_id,
          );
          const text = this.messagingService.buildIssueResolvedText({
            factoryName,
            issueId: snapshot.id,
            message: snapshot.message,
          });
          await this.messagingService.broadcastToOwnersManagers(
            snapshot.factory_id,
            text,
          );
        })(),
        'issue-resolved',
      );
    }

    return issue;
  }

  async remove(id: number) {
    const issue = await this.IssueModel.findByPk(id);
    if (!issue) throw new NotFoundException('Issue not found');
    await issue.destroy();
    return { message: 'Issue deleted' };
  }
}

@Controller('issues')
export class IssueController {
  constructor(private readonly issuesService: IssueService) {}

  @Get()
  findAll(
    @Query('factory_id') factory_id?: string,
    @Query('is_resolved') is_resolved?: string,
  ) {
    return this.issuesService.findAll({
      factory_id: factory_id ? Number(factory_id) : undefined,
      is_resolved:
        is_resolved === undefined
          ? undefined
          : is_resolved === 'true' || is_resolved === '1',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.issuesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateIssueDto) {
    return this.issuesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issuesService.update(id, dto);
  }

  @Patch(':id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.issuesService.resolveIssue(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.issuesService.remove(id);
  }
}
