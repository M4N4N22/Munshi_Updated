import { Injectable, Logger } from '@nestjs/common';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { DomainEvent } from 'src/services/domain-events/domain-events.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { buildInventoryLowStockAlertText } from 'src/modules/whatsapp/whatsapp.templates';
import { InventoryLowStockEventPayload } from './inventory.low-stock.helper';
import { formatQuantity } from './inventory.validation';
import {
  lowStockRecipientInputFromPayload,
  resolveDepartmentManagerPhoneForLowStockAlert,
  uniqueAlertPhones,
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

    const ownerPhone = await this.resolveOwnerPhone(factoryId);
    const managerPhone = await this.resolveDepartmentManagerPhone(
      factoryId,
      payload,
    );
    const recipients = uniqueAlertPhones(ownerPhone, managerPhone);

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
    const text = buildInventoryLowStockAlertText({
      itemName,
      sku,
      currentQuantity: currentQty,
      reorderThreshold: threshold,
      inventoryItemId: Number.isFinite(inventoryItemId) ? inventoryItemId : 0,
    });

    await this.sendAlertIndependently(recipients, text, event.id);
  }

  private async sendAlertIndependently(
    recipients: string[],
    text: string,
    eventId: number,
  ): Promise<void> {
    for (const phone of recipients) {
      try {
        await this.messagingService.sendText(phone, text);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Low stock alert failed for ${phone} (event ${eventId}): ${message}`,
        );
      }
    }
  }

  private async resolveOwnerPhone(factoryId: number): Promise<string | null> {
    const ownerLink = await this.dbService.sqlService.FactoryUser.findOne({
      where: { factory_id: factoryId, role: USER_ROLE.OWNER },
      order: [['id', 'ASC']],
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['phone_number'],
        },
      ],
    });
    const phone = (ownerLink as any)?.user?.phone_number as string | undefined;
    return phone?.trim() ? phone.trim() : null;
  }

  private async resolveDepartmentManagerPhone(
    factoryId: number,
    payload: Partial<InventoryLowStockEventPayload>,
  ): Promise<string | null> {
    return resolveDepartmentManagerPhoneForLowStockAlert(
      this.dbService.sqlService,
      lowStockRecipientInputFromPayload(factoryId, payload),
    );
  }
}
