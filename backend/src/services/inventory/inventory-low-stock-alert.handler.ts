import { Injectable, Logger } from '@nestjs/common';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { DomainEvent } from 'src/services/domain-events/domain-events.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import { buildInventoryLowStockAlertOutbound } from 'src/core/messaging/inventory-low-stock-outbound';
import { InventoryLowStockEventPayload } from './inventory.low-stock.helper';
import { formatQuantity } from './inventory.validation';
import {
  resolveLowStockAlertRecipientPhones,
  type LowStockAlertDb,
} from './inventory-low-stock-alert.recipients';

@Injectable()
export class InventoryLowStockAlertHandler {
  private readonly logger = new Logger(InventoryLowStockAlertHandler.name);

  constructor(
    private readonly dbService: DbService,
    private readonly messagingService: MessagingService,
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = (event.payload ?? {}) as Partial<InventoryLowStockEventPayload>;
    const factoryId = Number(payload.factory_id ?? event.factory_id);
    if (!factoryId || !Number.isFinite(factoryId)) {
      this.logger.warn(`Domain event ${event.id} missing factory_id`);
      return;
    }

    const recipients = await resolveLowStockAlertRecipientPhones(
      this.dbService.sqlService as unknown as LowStockAlertDb,
      factoryId,
      payload,
    );

    if (recipients.length === 0) {
      this.logger.warn(
        `Factory #${factoryId} has no alert recipients — skipping low stock alert for event ${event.id}`,
      );
      return;
    }

    const itemName = String(payload.item_name ?? 'Item').trim();
    const sku = String(payload.sku ?? '').trim();
    const currentQty = formatQuantity(Number(payload.current_quantity ?? 0));
    const threshold = formatQuantity(Number(payload.reorder_threshold ?? 0));

    const inventoryItemId = Number(payload.inventory_item_id);
    const outbound = buildInventoryLowStockAlertOutbound({
      itemName,
      sku,
      currentQuantity: currentQty,
      reorderThreshold: threshold,
      inventoryItemId: Number.isFinite(inventoryItemId) ? inventoryItemId : 0,
    });

    await this.sendAlertIndependently(recipients, outbound, event.id);
  }

  private async sendAlertIndependently(
    recipients: string[],
    outbound: ReturnType<typeof buildInventoryLowStockAlertOutbound>,
    eventId: number,
  ): Promise<void> {
    for (const phone of recipients) {
      try {
        if (outbound.type === 'interactive_buttons') {
          await this.messagingService.sendInteractiveButtons(
            phone,
            outbound.body,
            outbound.buttons,
          );
        } else {
          await this.messagingService.sendText(phone, outbound.body);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Low stock alert failed for ${phone} (event ${eventId}): ${message}`,
        );
      }
    }
  }
}
