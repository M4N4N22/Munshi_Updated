import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import {
  formatQuantity,
  roundQuantity,
} from 'src/services/inventory/inventory.validation';
import { sumPendingStockOutForItem } from 'src/services/tasks/tasks.inventory-stock-warning.helper';

export type TaskInventoryStockAvailability = {
  onHand: number;
  pendingOut: number;
  available: number;
  unit: string;
  itemName: string;
};

@Injectable()
export class TaskInventoryStockAvailabilityService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly dbService: DbService,
  ) {}

  async getAvailability(
    factoryId: number,
    itemId: number,
  ): Promise<TaskInventoryStockAvailability> {
    const item = await this.inventoryService.findItem(itemId, factoryId);
    const onHand = roundQuantity(Number(item.current_quantity ?? 0));
    const pendingOut = await sumPendingStockOutForItem(
      factoryId,
      itemId,
      this.dbService.sqlService.TaskInventoryLine,
      this.dbService.sqlService.Task,
    );
    const available = Math.max(0, roundQuantity(onHand - pendingOut));

    return {
      onHand,
      pendingOut,
      available,
      unit: item.unit || 'unit',
      itemName: item.name,
    };
  }

  formatAvailableLabel(availability: TaskInventoryStockAvailability): string {
    const unit = availability.unit.trim() || 'unit';
    const availableText = formatQuantity(availability.available);
    const onHandText = formatQuantity(availability.onHand);

    if (availability.available <= 0) {
      if (availability.pendingOut > 0) {
        return (
          `📦 Stock abhi: *0* ${unit} available ` +
          `(on hand ${onHandText}, ${formatQuantity(availability.pendingOut)} open delivery tasks par)`
        );
      }
      return `📦 Stock abhi: *0* ${unit} available`;
    }

    if (availability.pendingOut > 0) {
      return (
        `📦 Stock abhi: *${availableText}* ${unit} available ` +
        `(on hand ${onHandText}, ${formatQuantity(availability.pendingOut)} open delivery tasks par)`
      );
    }

    return `📦 Stock abhi: *${availableText}* ${unit} available`;
  }
}
