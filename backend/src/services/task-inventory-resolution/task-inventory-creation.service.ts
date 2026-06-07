import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { TasksService } from 'src/services/tasks/tasks.service';
import { TASK_INVENTORY_MOVEMENT_TYPE } from 'src/services/tasks/tasks.inventory.constants';
import { FactoryService } from 'src/services/factories/factories.service';
import { formatQuantity, parsePositiveQuantity } from 'src/services/inventory/inventory.validation';
import { ITaskInventoryCreationSessionData } from '../workflow/workflow.interfaces';
import { TaskInventoryConfirmationService } from './task-inventory-confirmation.service';
import { formatTaskKindLabel, taskKindRequiresInventory } from './task-inventory-nl.helper';

export interface TaskInventoryCreateResult {
  taskId: number;
  message: string;
}

@Injectable()
export class TaskInventoryCreationService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly inventoryService: InventoryService,
    private readonly factoryService: FactoryService,
    private readonly confirmationService: TaskInventoryConfirmationService,
  ) {}

  async createFromSession(
    data: ITaskInventoryCreationSessionData,
    assignedBy: number,
    factoryId: number,
  ): Promise<TaskInventoryCreateResult> {
    if (data.task_created_id) {
      return {
        taskId: data.task_created_id,
        message: this.confirmationService.buildAlreadyCreatedMessage(
          data.task_created_id,
        ),
      };
    }

    if (!data.worker_user_id) {
      throw new BadRequestException('Worker is required to create a task');
    }

    await this.assertWorkerInFactory(data.worker_user_id, factoryId);

    const taskKind = data.task_kind ?? null;
    const workerName = data.worker_name ?? `User #${data.worker_user_id}`;

    if (taskKindRequiresInventory(taskKind)) {
      return this.createInventoryLinkedTask(
        data,
        assignedBy,
        factoryId,
        workerName,
        taskKind,
      );
    }

    return this.createGenericTask(data, assignedBy, factoryId, workerName, taskKind);
  }

  private async createInventoryLinkedTask(
    data: ITaskInventoryCreationSessionData,
    assignedBy: number,
    factoryId: number,
    workerName: string,
    taskKind: string | null,
  ): Promise<TaskInventoryCreateResult> {
    if (!data.inventory_item_id) {
      throw new BadRequestException('Inventory item is required');
    }

    let item;
    try {
      item = await this.inventoryService.findItem(
        data.inventory_item_id,
        factoryId,
      );
    } catch {
      throw new NotFoundException(
        this.confirmationService.buildRecoveryMessage(
          'Inventory unavailable',
          'The selected inventory item no longer exists. Please start again with a new message.',
        ),
      );
    }

    let quantity: number;
    try {
      quantity = parsePositiveQuantity(String(data.quantity ?? ''));
    } catch {
      throw new BadRequestException(
        this.confirmationService.buildRecoveryMessage(
          'Invalid quantity',
          'Quantity must be a positive number. Please start again.',
        ),
      );
    }

    const quantityStr = formatQuantity(quantity);
    const itemLabel = item.unit ? `${item.name} ${item.unit}` : item.name;
    const prefix =
      taskKind === 'issue' ? 'ISSUE' : 'DELIVERY';
    const description = `[${prefix}] ${itemLabel} (${item.sku}) x${quantityStr}`;

    const result = await this.tasksService.assignToUser(
      data.worker_user_id!,
      assignedBy,
      factoryId,
      description,
      {
        inventory_lines: [
          {
            inventory_item_id: item.id,
            quantity_expected: quantityStr,
            movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
          },
        ],
      },
    );

    const taskId = this.extractTaskIdFromAssignResult(result);
    const message = this.confirmationService.buildTaskCreatedMessage({
      taskId,
      workerName,
      itemName: item.name,
      quantity: quantityStr,
      taskKind,
    });

    return { taskId, message };
  }

  private async createGenericTask(
    data: ITaskInventoryCreationSessionData,
    assignedBy: number,
    factoryId: number,
    workerName: string,
    taskKind: string | null,
  ): Promise<TaskInventoryCreateResult> {
    const label = formatTaskKindLabel(taskKind);
    const description = `[${label.toUpperCase().replace(/\s+/g, '_')}] ${data.raw_message?.trim() || label}`;

    const result = await this.tasksService.assignToUser(
      data.worker_user_id!,
      assignedBy,
      factoryId,
      description,
    );

    const taskId = this.extractTaskIdFromAssignResult(result);
    const message = this.confirmationService.buildTaskCreatedMessage({
      taskId,
      workerName,
      taskKind,
    });

    return { taskId, message };
  }

  private async assertWorkerInFactory(
    userId: number,
    factoryId: number,
  ): Promise<void> {
    const members = await this.factoryService.getFactoryUsers(factoryId);
    const found = (members as any[]).some(
      (m) => Number(m.user_id ?? m.user?.id) === userId,
    );
    if (!found) {
      throw new NotFoundException(
        this.confirmationService.buildRecoveryMessage(
          'Worker unavailable',
          'The selected worker is no longer in your factory. Please start again.',
        ),
      );
    }
  }

  private extractTaskIdFromAssignResult(result: unknown): number {
    if (typeof result === 'string') {
      const match = result.match(/Task #(\d+)/i);
      if (match?.[1]) return Number(match[1]);
    }
    if (result && typeof result === 'object' && 'id' in (result as object)) {
      return Number((result as { id: number }).id);
    }
    throw new BadRequestException('Task was created but id could not be read');
  }
}
