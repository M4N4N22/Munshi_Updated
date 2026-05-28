import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Logger,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserService } from '../users/users.service';
import { randomUUID } from 'crypto';
import { USER_ROLE } from '../users/users.constants';
import { Task, TaskUpdate } from './tasks.schema';
import { FactoryUser } from '../factories/factories.schema';
import { User } from '../users/users.schema';
import {
  AddTaskUpdateDto,
  CreateTaskDto,
  UpdateTaskDto,
} from './tasks.dto';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { Op } from 'sequelize';
import { TASK_ROUTING_STATUS } from './tasks.routing.constants';
import { DepartmentsService } from '../departments/departments.service';
import { DepartmentWorker } from '../departments/departments.schema';
import { parseIndiaDefaultDeadline } from 'src/core/time/india-defaults';

type ResolvedMention =
  | { kind: 'all' }
  | { kind: 'user'; user: { id: number; name?: string; phone_number: string } }
  | { kind: 'ambiguous'; message: string };

@Injectable()
export class TasksService {
  private readonly log = new Logger(TasksService.name);
  private readonly taskModel: typeof Task;
  private readonly taskUpdateModel: typeof TaskUpdate;
  private readonly factoryUserModel: typeof FactoryUser;
  private readonly userModel: typeof User;
  private readonly departmentWorkerModel: typeof DepartmentWorker;

  constructor(
    private readonly dbService: DbService,
    private readonly usersService: UserService,
    private readonly messagingService: MessagingService,
    private readonly departmentsService: DepartmentsService,
  ) {
    this.taskModel = this.dbService.sqlService.Task;
    this.taskUpdateModel = this.dbService.sqlService.TaskUpdate;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
    this.userModel = this.dbService.sqlService.User;
    this.departmentWorkerModel = this.dbService.sqlService.DepartmentWorker;
  }

  /** Parsed with India (IST) as default timezone for naive deadline strings. */
  private normalizeDeadline(
    deadline?: string | null,
  ): Date | null | undefined {
    if (deadline === undefined) return undefined;
    if (deadline === null || String(deadline).trim() === '') return null;
    return parseIndiaDefaultDeadline(String(deadline).trim());
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

  private async buildRoutingForNewTask(
    assignedTo: number,
    assignedBy: number,
    factoryId: number,
  ): Promise<{ routing_status: string; owner_id: number | null }> {
    const assigneeRole = await this.getFactoryRole(assignedTo, factoryId);
    const assignerRole = await this.getFactoryRole(assignedBy, factoryId);
    if (
      assignerRole === USER_ROLE.OWNER &&
      assigneeRole === USER_ROLE.MANAGER
    ) {
      return {
        routing_status: TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION,
        owner_id: assignedBy,
      };
    }
    return { routing_status: TASK_ROUTING_STATUS.DIRECT, owner_id: null };
  }

  /**
   * Blocks /mgrself and /mgrassign when the task id points at a row that is
   * already routed (e.g. delegated to a worker), so a wrong id gives a clear
   * error instead of "You are not the assignee for this task".
   */
  private assertTaskEligibleForManagerRouting(task: Task, taskId: number): void {
    if (task.is_completed) {
      throw new BadRequestException('Task is already completed');
    }
    const rs = (task as any).routing_status as string | null | undefined;

    if (rs === TASK_ROUTING_STATUS.DELEGATED_TO_WORKER) {
      throw new BadRequestException(
        `Task #${taskId} is already assigned to a worker and cannot be changed this way.`,
      );
    }
    if (rs === TASK_ROUTING_STATUS.MANAGER_SELF) {
      throw new BadRequestException(
        `Task #${taskId} is already set for you to execute yourself. Use /complete ${taskId} when done.`,
      );
    }
    if (rs === TASK_ROUTING_STATUS.REJECTED_BY_MANAGER) {
      throw new BadRequestException(`Task #${taskId} was rejected by the manager.`);
    }
    if (rs !== TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION) {
      throw new BadRequestException(
        `Task #${taskId} is not awaiting a manager routing decision (for example it may be a direct assignment).`,
      );
    }
  }

  // 📋 ASSIGN TASK
  async handleAssign(
    user_id: number,
    factory_id: number,
    mention: string,
    description: string,
    options?: { slugDepartmentId?: number; deadline?: string | null },
  ) {
    if (!mention || !description) {
      throw new NotFoundException('Invalid assign command');
    }

    const resolved = await this.resolveMention(mention, factory_id);

    if (resolved.kind === 'all') {
      return this.assignToAll(user_id, factory_id, description, options);
    }

    if (resolved.kind === 'ambiguous') {
      return { message: resolved.message, needsDisambiguation: true };
    }

    return this.assignToUser(
      resolved.user.id,
      user_id,
      factory_id,
      description,
      options,
    );
  }

  // 🔎 Resolve `@all`, `@<id>`, `@<phone>` or `@<name>` to a factory user.
  // Names match firstname / lastname / full name (case-insensitive). When
  // multiple users match by name, returns an "ambiguous" result with a list
  // so the assigner can re-send the command with a unique identifier.
  async resolveMention(
    mention: string,
    factory_id: number,
  ): Promise<ResolvedMention> {
    const token = mention
      .replace(/^@/, '')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();

    if (!token) {
      throw new NotFoundException('Invalid mention');
    }

    if (token === 'all') {
      return { kind: 'all' };
    }

    const factoryUsers: any[] = await this.factoryUserModel.findAll({
      where: { factory_id },
      include: [
        {
          model: this.userModel,
          as: 'user',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      raw: true,
      nest: true,
    });

    const members = factoryUsers
      .map((fu) => fu.user)
      .filter((u) => u && u.id);

    // Numeric token → try user id first, then fall back to phone number.
    if (/^\d+$/.test(token)) {
      const byId = members.find((u) => Number(u.id) === Number(token));
      if (byId) return { kind: 'user', user: byId };

      const byPhone = members.find(
        (u) => (u.phone_number || '').replace(/\D/g, '') === token,
      );
      if (byPhone) return { kind: 'user', user: byPhone };

      throw new NotFoundException(
        `No user with id or phone "${token}" in your factory`,
      );
    }

    // Name match → exact full-name OR any name-part equality (case-insensitive).
    const matches = members.filter((u) => {
      const name = (u.name || '').toLowerCase().trim();
      if (!name) return false;
      if (name === token) return true;
      const parts = name.split(/\s+/);
      return parts.includes(token);
    });

    if (matches.length === 0) {
      throw new NotFoundException(
        `No user found matching "@${token}" in your factory`,
      );
    }

    if (matches.length === 1) {
      return { kind: 'user', user: matches[0] };
    }

    const list = matches
      .map(
        (u, i) =>
          `${i + 1}. ${u.name} — use @${u.id} or @${u.phone_number}`,
      )
      .join('\n');

    return {
      kind: 'ambiguous',
      message: waSection(
        'Multiple people found',
        `Several team members match *@${token}*:\n\n${list}`,
        'Please send the command again using a unique @id or @phone.',
      ),
    };
  }

  // 👤 Assign to one
  async assignToUser(
    assigneeUserId: number,
    assigned_by: number,
    factory_id: number,
    description: string,
    options?: { slugDepartmentId?: number; deadline?: string | null },
  ) {
    if (!assigneeUserId) {
      throw new NotFoundException('Assignee not found');
    }

    const assignerRole = await this.getFactoryRole(assigned_by, factory_id);
    const assigneeRole = await this.getFactoryRole(assigneeUserId, factory_id);
    if (
      assignerRole === USER_ROLE.MANAGER &&
      assigneeRole === USER_ROLE.WORKER
    ) {
      await this.departmentsService.assertManagerCanAssignWorker(
        assigned_by,
        factory_id,
        assigneeUserId,
      );
    }

    const { routing_status, owner_id } = await this.buildRoutingForNewTask(
      assigneeUserId,
      assigned_by,
      factory_id,
    );

    const department_id =
      await this.departmentsService.resolveDepartmentIdForNewTask({
        factoryId: factory_id,
        assignedBy: assigned_by,
        assigneeUserId,
        slugDepartmentId: options?.slugDepartmentId,
      });

    const deadline = this.normalizeDeadline(options?.deadline);

    const task = await this.taskModel.create({
      assigned_to: assigneeUserId,
      assigned_by,
      factory_id,
      description,
      routing_status,
      owner_id,
      department_id,
      ...(deadline !== undefined && deadline !== null
        ? { deadline, deadline_breach_reminded_at: null }
        : {}),
    } as any);

    if (routing_status === TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION) {
      this.messagingService.fireAndForget(
        this.notifyManagerRoutingPrompt(task.id),
        'mgr-route-prompt',
      );
    } else {
      this.messagingService.fireAndForget(
        this.notifyWorkerTaskAssigned(task.id),
        'task-assigned',
      );
    }

    return 'The assignee has been notified on WhatsApp.';
  }

  // 👥 Assign to ALL
  async assignToAll(
    assigned_by: number,
    factory_id: number,
    description: string,
    options?: { deadline?: string | null },
  ) {
    const assignerRole = await this.getFactoryRole(assigned_by, factory_id);

    const workerWhere: Record<string, unknown> = {
      factory_id,
      role: USER_ROLE.WORKER,
    };

    if (assignerRole === USER_ROLE.MANAGER) {
      const ids = await this.departmentsService.getAssignableWorkerUserIdsForManager(
        assigned_by,
        factory_id,
      );
      if (ids.length === 0) {
        return waSection(
          'No assignees available',
          'You do not have any workers you are allowed to assign tasks to in this factory.',
        );
      }
      workerWhere['user_id'] = { [Op.in]: ids };
    }

    const workers = await this.factoryUserModel.findAll({
      where: workerWhere as any,
    });

    if (workers.length === 0) {
      return waSection(
        'No workers found',
        'There are no workers in this factory to assign the task to.',
      );
    }

    let department_id: number | null = null;
    if (assignerRole === USER_ROLE.MANAGER) {
      const d = await this.departmentsService.getDepartmentForManager(
        assigned_by,
        factory_id,
      );
      department_id = d?.id ?? null;
    }

    const batchId = randomUUID();

    const deadline = this.normalizeDeadline(options?.deadline);

    const tasks = workers.map((w) => ({
      assigned_to: w.user_id,
      assigned_by,
      factory_id,
      description,
      batch_id: batchId,
      routing_status: TASK_ROUTING_STATUS.DIRECT,
      owner_id: null,
      department_id,
      ...(deadline !== undefined && deadline !== null
        ? { deadline, deadline_breach_reminded_at: null }
        : {}),
    }));

    await this.taskModel.bulkCreate(tasks);

    const created = await this.taskModel.findAll({
      where: { batch_id: batchId },
      attributes: ['id'],
    });
    for (const row of created) {
      this.messagingService.fireAndForget(
        this.notifyWorkerTaskAssigned(row.id),
        'task-assigned',
      );
    }

    return `${workers.length} worker${workers.length === 1 ? '' : 's'} have been notified on WhatsApp.`;
  }

  /** WhatsApp: manager accepts self-execution (no worker delegation). */
  async applyManagerSelf(
    managerUserId: number,
    factoryId: number,
    taskId: number,
  ): Promise<string> {
    const role = await this.getFactoryRole(managerUserId, factoryId);
    if (role !== USER_ROLE.MANAGER) {
      throw new ForbiddenException('Only managers can accept owner tasks for themselves');
    }

    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.factory_id !== factoryId) {
      throw new NotFoundException('Task does not belong to your factory');
    }
    this.assertTaskEligibleForManagerRouting(task, taskId);
    if (task.assigned_to !== managerUserId) {
      throw new ForbiddenException('You are not the assignee for this task');
    }

    await task.update({
      routing_status: TASK_ROUTING_STATUS.MANAGER_SELF,
    } as any);

    return waSection(
      'You accepted this task',
      `*Task #${taskId}* is now assigned to you.\n\nWhen finished, reply:\n` +
        `• "complete task ${taskId}"\n` +
        `• "task ${taskId} done"\n\n` +
        `Wrong department? Use /mgrtransfer ${taskId} [dept] or /mgrreject ${taskId} [reason]`,
    );
  }

  /** WhatsApp: manager delegates to a worker (@mention). */
  async applyManagerDelegateWorker(
    managerUserId: number,
    factoryId: number,
    taskId: number,
    mention: string,
  ): Promise<string> {
    const role = await this.getFactoryRole(managerUserId, factoryId);
    if (role !== USER_ROLE.MANAGER) {
      throw new ForbiddenException('Only managers can delegate owner tasks to workers');
    }

    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.factory_id !== factoryId) {
      throw new NotFoundException('Task does not belong to your factory');
    }
    this.assertTaskEligibleForManagerRouting(task, taskId);
    if (task.assigned_to !== managerUserId) {
      throw new ForbiddenException('You are not the assignee for this task');
    }

    const resolved = await this.resolveMention(mention, factoryId);
    if (resolved.kind === 'all') {
      throw new BadRequestException('Pick one worker, not @all');
    }
    if (resolved.kind === 'ambiguous') {
      throw new BadRequestException(resolved.message);
    }

    const workerId = resolved.user.id;
    const workerRole = await this.getFactoryRole(workerId, factoryId);
    if (workerRole !== USER_ROLE.WORKER) {
      throw new BadRequestException(
        'You can only assign to a factory worker (WORKER role)',
      );
    }

    await this.departmentsService.assertManagerCanAssignWorker(
      managerUserId,
      factoryId,
      workerId,
    );

    const dept = await this.departmentsService.getDepartmentForManager(
      managerUserId,
      factoryId,
    );

    await task.update({
      assigned_to: workerId,
      assigned_by: managerUserId,
      routing_status: TASK_ROUTING_STATUS.DELEGATED_TO_WORKER,
      department_id: dept?.id ?? null,
    } as any);

    this.messagingService.fireAndForget(
      this.notifyWorkerTaskAssigned(task.id),
      'task-assigned',
    );

    const assigneeLabel =
      resolved.user.name ||
      resolved.user.phone_number ||
      `User #${resolved.user.id}`;
    return waSection(
      'Task delegated',
      `*Task #${taskId}*\n` +
        `*Assignee:* ${assigneeLabel} (#${resolved.user.id})\n\n` +
        `They have been notified on WhatsApp.`,
    );
  }

  async addUpdate(
    user_id: number,
    factory_id: number,
    task_id: number,
    message: string,
  ) {
    const cleanMessage = message.trim();

    if (!task_id || !cleanMessage) {
      throw new NotFoundException('Invalid update command');
    }

    // 🔥 Find task
    const task = await this.taskModel.findByPk(task_id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 🔒 Security checks
    if (task.factory_id != factory_id) {
      throw new NotFoundException('Task does not belong to your factory');
    }

    if (task.assigned_to != user_id) {
      throw new NotFoundException('You are not assigned to this task');
    }

    if (task.is_completed) {
      throw new NotFoundException('Task already completed');
    }

    // 🔄 Create update
    await this.taskUpdateModel.create({
      task_id,
      user_id,
      message: cleanMessage,
    });

    // ✅ Auto-complete logic
    const lower = cleanMessage.toLowerCase();

    return {
      message: 'Update added successfully',
      task_id,
    };
  }

  async getTasks(user: any) {
    const userId = user.id;
    const factoryId = user.factory_links.factory_id;
    const role = user.factory_links.role;

    const departmentModel = this.dbService.sqlService.Department;

    const baseInclude = [
      {
        model: this.userModel,
        as: 'assignee',
        attributes: ['id', 'name', 'phone_number'],
      },
      {
        model: this.userModel,
        as: 'assigner',
        attributes: ['id', 'name', 'phone_number'],
      },
      {
        model: departmentModel,
        as: 'department',
        attributes: ['id', 'name', 'slug', 'manager_user_id'],
        required: false,
        include: [
          {
            model: this.userModel,
            as: 'manager',
            attributes: ['id', 'name', 'phone_number'],
          },
        ],
      },
    ];

    const excludeRejected = {
      [Op.or]: [
        { routing_status: { [Op.is]: null } },
        {
          routing_status: {
            [Op.ne]: TASK_ROUTING_STATUS.REJECTED_BY_MANAGER,
          },
        },
      ],
    };

    // 👷 WORKER → only their own pending tasks
    if (role === USER_ROLE.WORKER) {
      const tasks = await this.taskModel.findAll({
        where: {
          assigned_to: userId,
          factory_id: factoryId,
          is_completed: false,
          ...excludeRejected,
        },
        include: baseInclude,
        order: [['created_at', 'DESC']],
      });

      if (!tasks.length) {
        return { message: 'No pending tasks 🎉' };
      }
      return tasks;
    }

    // 👔 MANAGER / OWNER → pending tasks (owners also see manager-rejected)
    const managerWhere: Record<string, unknown> = {
      factory_id: factoryId,
      is_completed: false,
    };
    if (role !== USER_ROLE.OWNER) {
      Object.assign(managerWhere, excludeRejected);
    }

    const tasks = await this.taskModel.findAll({
      where: managerWhere,
      include: baseInclude,
      order: [
        ['department_id', 'ASC'],
        ['assigned_by', 'ASC'],
        ['created_at', 'DESC'],
      ],
      limit: 100,
    });

    if (!tasks.length) {
      return { message: 'No pending tasks yet' };
    }
    return tasks;
  }

  private formatTasks(tasks: any[], title: string) {
    let text = `${title}\n\n`;

    tasks.forEach((task, index) => {
      text += `${index + 1}. ${task.description}\n`;
      text += `🆔 ${task.id}\n\n`;
    });

    return text;
  }

  /** Role + department label for WhatsApp completion / rejection messages. */
  async formatUserDesignation(
    userId: number,
    factoryId: number,
  ): Promise<{ name: string; phone?: string; designation: string }> {
    const user = await this.userModel.findByPk(userId, {
      attributes: ['id', 'name', 'phone_number'],
    });
    const role = await this.getFactoryRole(userId, factoryId);
    const dept = await this.departmentsService.getDepartmentForManager(
      userId,
      factoryId,
    );

    let designation = role ?? 'Member';
    if (role === USER_ROLE.OWNER) {
      designation = 'Owner';
    } else if (role === USER_ROLE.MANAGER) {
      designation = dept
        ? `Manager · ${dept.name} Dept`
        : 'Manager';
    } else if (role === USER_ROLE.WORKER) {
      designation = 'Worker';
      const dw = await this.departmentWorkerModel.findOne({
        where: { user_id: userId },
        include: [
          {
            model: this.dbService.sqlService.Department,
            as: 'department',
            where: { factory_id: factoryId },
            required: false,
          },
        ],
      });
      if ((dw as any)?.department?.name) {
        designation = `Worker · ${(dw as any).department.name} Dept`;
      }
    }

    return {
      name: user?.name || `User #${userId}`,
      phone: user?.phone_number,
      designation,
    };
  }

  private async managerMayCompleteTask(
    managerUserId: number,
    factoryId: number,
    task: Task,
  ): Promise<boolean> {
    const role = await this.getFactoryRole(managerUserId, factoryId);
    if (role !== USER_ROLE.MANAGER) return false;

    if (task.assigned_to === managerUserId) return true;
    if (task.assigned_by === managerUserId) return true;

    const dept = await this.departmentsService.getDepartmentForManager(
      managerUserId,
      factoryId,
    );
    if (dept && task.department_id === dept.id) return true;

    return false;
  }

  private assertManagerIsAssigneeForRouting(
    managerUserId: number,
    task: Task,
    taskId: number,
  ): void {
    if (task.assigned_to !== managerUserId) {
      throw new ForbiddenException(
        `Only the department manager assigned to task #${taskId} can perform this action.`,
      );
    }
    if (
      (task as any).routing_status ===
      TASK_ROUTING_STATUS.REJECTED_BY_MANAGER
    ) {
      throw new BadRequestException(`Task #${taskId} was already rejected.`);
    }
    if (task.is_completed) {
      throw new BadRequestException(`Task #${taskId} is already completed.`);
    }
  }

  async completeTask(user_id: number, factory_id: number, task_id: number) {
    if (!task_id) {
      throw new NotFoundException('Task ID required');
    }

    const task = await this.taskModel.findByPk(task_id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.factory_id !== factory_id) {
      throw new NotFoundException('Task does not belong to your factory');
    }

    if (
      (task as any).routing_status ===
      TASK_ROUTING_STATUS.REJECTED_BY_MANAGER
    ) {
      throw new BadRequestException(
        `Task #${task_id} was rejected and cannot be completed.`,
      );
    }

    if (task.is_completed) {
      return {
        message: `Task #${task_id} was already marked as completed.`,
      };
    }

    const role = await this.getFactoryRole(user_id, factory_id);
    const managerCanComplete =
      role === USER_ROLE.MANAGER &&
      (await this.managerMayCompleteTask(user_id, factory_id, task));

    if (!managerCanComplete && task.assigned_to !== user_id) {
      throw new NotFoundException('You are not assigned to this task');
    }

    if (
      !managerCanComplete &&
      (task as any).routing_status ===
        TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION
    ) {
      throw new BadRequestException(
        `Task #${task.id} is waiting for your decision. Reply with "I will do task ${task.id}" or "@name will do task ${task.id}".`,
      );
    }

    await task.update({
      is_completed: true,
      completed_by: user_id,
    } as any);

    this.messagingService.fireAndForget(
      this.notifyTaskCompleted(task.id, user_id),
      'task-completed',
    );

    const who = await this.formatUserDesignation(user_id, factory_id);
    return {
      message:
        `Task #${task_id} marked as completed.\n\n` +
        `*Completed by:* ${who.name} (#${user_id})\n` +
        `*Role:* ${who.designation}` +
        (who.phone ? `\n*Phone:* ${who.phone}` : ''),
    };
  }

  /** Reassign an owner-routed task to another department's manager. */
  async applyManagerTransferDepartment(
    managerUserId: number,
    factoryId: number,
    taskId: number,
    departSlug: string,
  ): Promise<string> {
    const role = await this.getFactoryRole(managerUserId, factoryId);
    if (role !== USER_ROLE.MANAGER) {
      throw new ForbiddenException('Only managers can transfer tasks between departments');
    }

    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.factory_id !== factoryId) {
      throw new NotFoundException('Task does not belong to your factory');
    }

    this.assertManagerIsAssigneeForRouting(managerUserId, task, taskId);

    const rs = (task as any).routing_status as string | null;
    const transferable: string[] = [
      TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION,
      TASK_ROUTING_STATUS.MANAGER_SELF,
    ];
    if (!rs || !transferable.includes(rs)) {
      throw new BadRequestException(
        `Task #${taskId} cannot be transferred in its current state.`,
      );
    }

    const targetDept = await this.departmentsService.findDepartmentBySlug(
      factoryId,
      departSlug,
    );
    if (!targetDept) {
      throw new NotFoundException(
        `No department matches "${departSlug}" in your factory.`,
      );
    }
    if (targetDept.manager_user_id === managerUserId) {
      throw new BadRequestException(
        'This task is already assigned to your department. Choose a different department.',
      );
    }

    const ownerId =
      task.owner_id ?? task.assigned_by;

    await task.update({
      assigned_to: targetDept.manager_user_id,
      assigned_by: ownerId,
      department_id: targetDept.id,
      routing_status: TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION,
      owner_id: ownerId,
    } as any);

    this.messagingService.fireAndForget(
      this.notifyManagerRoutingPrompt(task.id),
      'mgr-transfer-prompt',
    );

    return waSection(
      'Task transferred',
      `*Task #${taskId}* has been sent to the *${targetDept.name}* department (\`${targetDept.slug}\`).\n\n` +
        `The department head has been notified to accept or delegate the task.`,
    );
  }

  /** Manager rejects a misrouted task; owner is notified with the reason. */
  async applyManagerRejectTask(
    managerUserId: number,
    factoryId: number,
    taskId: number,
    reason: string,
  ): Promise<string> {
    const role = await this.getFactoryRole(managerUserId, factoryId);
    if (role !== USER_ROLE.MANAGER) {
      throw new ForbiddenException('Only managers can reject tasks');
    }

    const cleanReason = reason?.trim();
    if (!cleanReason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.factory_id !== factoryId) {
      throw new NotFoundException('Task does not belong to your factory');
    }

    this.assertManagerIsAssigneeForRouting(managerUserId, task, taskId);

    const rs = (task as any).routing_status as string | null;
    const rejectable: string[] = [
      TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION,
      TASK_ROUTING_STATUS.MANAGER_SELF,
    ];
    if (!rs || !rejectable.includes(rs)) {
      throw new BadRequestException(
        `Task #${taskId} cannot be rejected in its current state.`,
      );
    }

    await task.update({
      routing_status: TASK_ROUTING_STATUS.REJECTED_BY_MANAGER,
      rejected_by: managerUserId,
      rejection_reason: cleanReason,
      rejected_at: new Date(),
    } as any);

    this.messagingService.fireAndForget(
      this.notifyOwnerTaskRejected(task.id, managerUserId),
      'task-rejected',
    );

    const mgr = await this.formatUserDesignation(managerUserId, factoryId);
    return waSection(
      'Task rejected',
      `*Task #${taskId}* has been rejected.\n\n` +
        `*Reason:* ${cleanReason}\n\n` +
        `The owner has been notified.\n\n` +
        `*Rejected by:* ${mgr.name} — ${mgr.designation}`,
    );
  }

  // =========================================================================
  // 🛠️ Admin / dashboard helpers
  // =========================================================================

  async adminList(opts: {
    factory_id?: number;
    assigned_to?: number;
    is_completed?: boolean;
  }) {
    const where: any = {};
    if (opts.factory_id) where.factory_id = opts.factory_id;
    if (opts.assigned_to) where.assigned_to = opts.assigned_to;
    if (typeof opts.is_completed === 'boolean')
      where.is_completed = opts.is_completed;

    return this.taskModel.findAll({
      where,
      include: [
        {
          model: this.userModel,
          as: 'assignee',
          attributes: ['id', 'name', 'phone_number'],
        },
        {
          model: this.userModel,
          as: 'assigner',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async adminFindOne(id: number) {
    const task = await this.taskModel.findByPk(id, {
      include: [
        {
          model: this.userModel,
          as: 'assignee',
          attributes: ['id', 'name', 'phone_number'],
        },
        {
          model: this.userModel,
          as: 'assigner',
          attributes: ['id', 'name', 'phone_number'],
        },
        {
          model: this.taskUpdateModel,
          as: 'updates',
        },
      ],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async adminCreate(dto: CreateTaskDto) {
    const deadline = this.normalizeDeadline(dto.deadline);
    const assignerRole = await this.getFactoryRole(
      dto.assigned_by,
      dto.factory_id,
    );
    const assigneeRole = await this.getFactoryRole(
      dto.assigned_to,
      dto.factory_id,
    );
    if (
      assignerRole === USER_ROLE.MANAGER &&
      assigneeRole === USER_ROLE.WORKER
    ) {
      await this.departmentsService.assertManagerCanAssignWorker(
        dto.assigned_by,
        dto.factory_id,
        dto.assigned_to,
      );
    }

    const { routing_status, owner_id } = await this.buildRoutingForNewTask(
      dto.assigned_to,
      dto.assigned_by,
      dto.factory_id,
    );

    const department_id =
      await this.departmentsService.resolveDepartmentIdForNewTask({
        factoryId: dto.factory_id,
        assignedBy: dto.assigned_by,
        assigneeUserId: dto.assigned_to,
      });

    const task = await this.taskModel.create({
      factory_id: dto.factory_id,
      assigned_to: dto.assigned_to,
      assigned_by: dto.assigned_by,
      description: dto.description,
      routing_status,
      owner_id,
      department_id,
      ...(deadline !== undefined && deadline !== null
        ? { deadline, deadline_breach_reminded_at: null }
        : {}),
    } as any);

    if (routing_status === TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION) {
      this.messagingService.fireAndForget(
        this.notifyManagerRoutingPrompt(task.id),
        'mgr-route-prompt',
      );
    } else {
      this.messagingService.fireAndForget(
        this.notifyWorkerTaskAssigned(task.id),
        'task-assigned',
      );
    }
    return task;
  }

  async adminUpdate(id: number, dto: UpdateTaskDto) {
    const task = await this.taskModel.findByPk(id);
    if (!task) throw new NotFoundException('Task not found');

    if (
      dto.assigned_to !== undefined &&
      dto.assigned_to !== task.assigned_to &&
      (task as any).routing_status ===
        TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION
    ) {
      throw new BadRequestException(
        'This task is waiting for the manager on WhatsApp. They must accept or delegate it in natural language before the assignee can be changed here.',
      );
    }

    const becomesComplete =
      dto.is_completed === true && !task.is_completed;

    if (
      dto.assigned_to !== undefined &&
      dto.assigned_to !== task.assigned_to
    ) {
      const newAssigneeRole = await this.getFactoryRole(
        dto.assigned_to,
        task.factory_id,
      );
      const assignerRole = await this.getFactoryRole(
        task.assigned_by,
        task.factory_id,
      );
      if (
        assignerRole === USER_ROLE.MANAGER &&
        newAssigneeRole === USER_ROLE.WORKER
      ) {
        await this.departmentsService.assertManagerCanAssignWorker(
          task.assigned_by,
          task.factory_id,
          dto.assigned_to,
        );
      }
    }

    const patch: Record<string, unknown> = {};
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.assigned_to !== undefined) patch.assigned_to = dto.assigned_to;
    if (dto.is_completed !== undefined) patch.is_completed = dto.is_completed;
    if (dto.deadline !== undefined) {
      const nd = this.normalizeDeadline(dto.deadline);
      if (nd === null) {
        patch.deadline = null;
        patch.deadline_breach_reminded_at = null;
      } else if (nd) {
        patch.deadline = nd;
        if (nd.getTime() > Date.now()) {
          patch.deadline_breach_reminded_at = null;
        }
      }
    }

    if (
      dto.assigned_to !== undefined &&
      dto.assigned_to !== task.assigned_to
    ) {
      patch['department_id'] =
        await this.departmentsService.resolveDepartmentIdForNewTask({
          factoryId: task.factory_id,
          assignedBy: task.assigned_by,
          assigneeUserId: dto.assigned_to,
        });
    }

    await task.update(patch as any);
    if (becomesComplete) {
      this.messagingService.fireAndForget(
        this.notifyTaskCompleted(task.id, (task as any).completed_by ?? task.assigned_to),
        'task-completed',
      );
    }
    return task;
  }

  async adminRemove(id: number) {
    const task = await this.taskModel.findByPk(id);
    if (!task) throw new NotFoundException('Task not found');
    await this.taskUpdateModel.destroy({ where: { task_id: id } });
    await task.destroy();
    return { message: 'Task deleted' };
  }

  async adminComplete(id: number, is_completed = true) {
    const task = await this.taskModel.findByPk(id);
    if (!task) throw new NotFoundException('Task not found');
    const patch: Record<string, unknown> = { is_completed };
    if (!is_completed) {
      patch.deadline_breach_reminded_at = null;
    }
    await task.update(patch as any);
    if (is_completed) {
      this.messagingService.fireAndForget(
        this.notifyTaskCompleted(task.id, (task as any).completed_by ?? task.assigned_to),
        'task-completed',
      );
    }
    return { message: `Task #${id} ${is_completed ? 'completed' : 'reopened'}` };
  }

  async adminAddUpdate(task_id: number, dto: AddTaskUpdateDto) {
    const task = await this.taskModel.findByPk(task_id);
    if (!task) throw new NotFoundException('Task not found');
    return this.taskUpdateModel.create({
      task_id,
      user_id: dto.user_id,
      message: dto.message,
    });
  }

  async adminGetUpdates(task_id: number) {
    return this.taskUpdateModel.findAll({
      where: { task_id },
      include: [
        {
          model: this.userModel,
          as: 'user',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      order: [['created_at', 'ASC']],
    });
  }

  /** Called by cron (Asia/Kolkata): one WhatsApp per assignee + assigner when deadline passed. */
  async processMissedDeadlineReminders(): Promise<void> {
    const now = new Date();
    const tasks = await this.taskModel.findAll({
      where: {
        is_completed: false,
        deadline: { [Op.lt]: now },
        deadline_breach_reminded_at: null,
        [Op.or]: [
          { routing_status: { [Op.is]: null } },
          {
            routing_status: {
              [Op.notIn]: [
                TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION,
                TASK_ROUTING_STATUS.REJECTED_BY_MANAGER,
              ],
            },
          },
        ],
      } as any,
      include: [
        {
          model: this.userModel,
          as: 'assignee',
          attributes: ['phone_number', 'name'],
        },
        {
          model: this.userModel,
          as: 'assigner',
          attributes: ['phone_number', 'name'],
        },
      ],
    });

    for (const task of tasks) {
      const row = task as Task & {
        assignee?: { phone_number?: string; name?: string };
        assigner?: { phone_number?: string; name?: string };
      };
      if (!task.deadline) continue;

      const deadlineIST = this.messagingService.formatInstantIST(
        new Date(task.deadline),
      );
      const factoryName = await this.messagingService.getFactoryName(
        task.factory_id,
      );

      try {
        const assigneePhone = row.assignee?.phone_number;
        const assignerPhone = row.assigner?.phone_number;

        if (assigneePhone) {
          await this.messagingService.sendText(
            assigneePhone,
            this.messagingService.buildDeadlineMissedWorkerText({
              factoryName,
              taskId: task.id,
              description: task.description,
              deadlineIST,
            }),
          );
          await new Promise((r) => setTimeout(r, 300));
        }

        if (assignerPhone && assignerPhone !== assigneePhone) {
          await this.messagingService.sendText(
            assignerPhone,
            this.messagingService.buildDeadlineMissedAssignerText({
              factoryName,
              taskId: task.id,
              description: task.description,
              workerName: row.assignee?.name || 'Assignee',
              deadlineIST,
            }),
          );
          await new Promise((r) => setTimeout(r, 300));
        } else if (!assigneePhone && assignerPhone) {
          await this.messagingService.sendText(
            assignerPhone,
            this.messagingService.buildDeadlineMissedAssignerText({
              factoryName,
              taskId: task.id,
              description: task.description,
              workerName: row.assignee?.name || 'Assignee',
              deadlineIST,
            }),
          );
          await new Promise((r) => setTimeout(r, 300));
        }

        await task.update({ deadline_breach_reminded_at: new Date() });
      } catch (e: any) {
        this.log.warn(
          `Deadline reminder failed for task #${task.id}: ${e?.message ?? e}`,
        );
      }
    }
  }

  private async notifyWorkerTaskAssigned(taskId: number) {
    const task = await this.taskModel.findByPk(taskId, {
      attributes: [
        'id',
        'factory_id',
        'assigned_to',
        'assigned_by',
        'description',
        'is_completed',
        'deadline',
        'routing_status',
      ],
    });
    if (!task || task.is_completed) return;
    if (
      (task as any).routing_status ===
      TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION
    ) {
      return;
    }

    const assignee = await this.userModel.findByPk(task.assigned_to, {
      attributes: ['phone_number', 'name'],
    });
    const assigner = await this.userModel.findByPk(task.assigned_by, {
      attributes: ['name'],
    });
    if (!assignee?.phone_number) return;

    const factoryName = await this.messagingService.getFactoryName(
      task.factory_id,
    );
    const deadlineIST = task.deadline
      ? this.messagingService.formatInstantIST(new Date(task.deadline))
      : undefined;
    const text = this.messagingService.buildTaskAssignedToWorkerText({
      factoryName,
      assignerName: assigner?.name || 'Manager',
      taskId: task.id,
      description: task.description,
      deadlineIST,
    });
    await this.messagingService.sendText(assignee.phone_number, text);
  }

  private async notifyTaskCompleted(
    taskId: number,
    completedByUserId?: number,
  ) {
    const task = await this.taskModel.findByPk(taskId, {
      attributes: [
        'id',
        'factory_id',
        'assigned_to',
        'assigned_by',
        'owner_id',
        'description',
        'is_completed',
        'completed_by',
      ],
    });
    if (!task || !task.is_completed) return;

    const completerId =
      completedByUserId ??
      (task as any).completed_by ??
      task.assigned_to;
    const completer = await this.formatUserDesignation(
      completerId,
      task.factory_id,
    );

    const notifyUserId = task.owner_id ?? task.assigned_by;
    const assigner = await this.userModel.findByPk(notifyUserId, {
      attributes: ['phone_number', 'name'],
    });
    if (!assigner?.phone_number) return;

    const factoryName = await this.messagingService.getFactoryName(
      task.factory_id,
    );
    const text = this.messagingService.buildTaskCompletedText({
      factoryName,
      completerName: completer.name,
      completerDesignation: completer.designation,
      completerPhone: completer.phone,
      taskId: task.id,
      description: task.description,
    });
    await this.messagingService.sendText(assigner.phone_number, text);
  }

  private async notifyOwnerTaskRejected(
    taskId: number,
    managerUserId: number,
  ) {
    const task = await this.taskModel.findByPk(taskId, {
      attributes: [
        'id',
        'factory_id',
        'owner_id',
        'assigned_by',
        'description',
        'rejection_reason',
        'routing_status',
      ],
    });
    if (
      !task ||
      (task as any).routing_status !== TASK_ROUTING_STATUS.REJECTED_BY_MANAGER
    ) {
      return;
    }

    const ownerId = task.owner_id ?? task.assigned_by;
    const owner = await this.userModel.findByPk(ownerId, {
      attributes: ['phone_number', 'name'],
    });
    if (!owner?.phone_number) return;

    const mgr = await this.formatUserDesignation(
      managerUserId,
      task.factory_id,
    );
    const factoryName = await this.messagingService.getFactoryName(
      task.factory_id,
    );
    const text = this.messagingService.buildTaskRejectedByManagerText({
      factoryName,
      taskId: task.id,
      description: task.description,
      reason: (task as any).rejection_reason || 'No reason provided',
      managerName: mgr.name,
      managerDesignation: mgr.designation,
      managerPhone: mgr.phone,
    });
    await this.messagingService.sendText(owner.phone_number, text);
  }

  private async notifyManagerRoutingPrompt(taskId: number) {
    const task = await this.taskModel.findByPk(taskId, {
      attributes: [
        'id',
        'factory_id',
        'assigned_to',
        'description',
        'deadline',
        'routing_status',
      ],
    });
    if (
      !task ||
      (task as any).routing_status !==
        TASK_ROUTING_STATUS.AWAITING_MANAGER_ACTION
    ) {
      return;
    }

    const mgr = await this.userModel.findByPk(task.assigned_to, {
      attributes: ['phone_number', 'name'],
    });
    if (!mgr?.phone_number) return;

    const factoryName = await this.messagingService.getFactoryName(
      task.factory_id,
    );
    const deadlineIST = task.deadline
      ? this.messagingService.formatInstantIST(new Date(task.deadline))
      : undefined;

    const workers =
      await this.departmentsService.listAssignableWorkersForManager(
        task.assigned_to,
        task.factory_id,
      );

    const msg = this.messagingService.buildManagerRoutingPromptText({
      factoryName,
      taskId: task.id,
      description: task.description,
      deadlineIST,
      workers,
    });

    await this.messagingService.sendText(mgr.phone_number, msg);
  }
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(
    @Query('factory_id') factory_id?: string,
    @Query('assigned_to') assigned_to?: string,
    @Query('is_completed') is_completed?: string,
  ) {
    return this.tasksService.adminList({
      factory_id: factory_id ? Number(factory_id) : undefined,
      assigned_to: assigned_to ? Number(assigned_to) : undefined,
      is_completed:
        is_completed === undefined
          ? undefined
          : is_completed === 'true' || is_completed === '1',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.adminFindOne(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.adminCreate(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.tasksService.adminUpdate(id, dto);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.adminComplete(id, true);
  }

  @Patch(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.adminComplete(id, false);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.adminRemove(id);
  }

  @Get(':id/updates')
  getUpdates(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.adminGetUpdates(id);
  }

  @Post(':id/updates')
  addUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTaskUpdateDto,
  ) {
    return this.tasksService.adminAddUpdate(id, dto);
  }
}
