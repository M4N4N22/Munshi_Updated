import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import { buildPurchaseRequestCreateCommand } from 'src/services/purchase-requests/purchase-request-prefill.helper';
import {
  LOW_STOCK_ALERT_CONTEXT_TTL_MS,
  LOW_STOCK_CTA_USER_MESSAGES,
} from './low-stock-alert-context.constants';

export type LowStockAlertContextRecord = {
  factory_id: number;
  inventory_item_id: number;
  inventory_item_name: string;
  alert_sent_at: Date;
  expires_at: Date;
};

export type LowStockCtaResolution =
  | { kind: 'command'; command: string }
  | { kind: 'disambiguation'; message: string }
  | { kind: 'expired'; message: string }
  | { kind: 'none'; message: string };

@Injectable()
export class LowStockAlertContextService {
  constructor(private readonly dbService: DbService) {}

  async recordAlertContext(params: {
    phone: string;
    factoryId: number;
    inventoryItemId: number;
    inventoryItemName: string;
    alertSentAt?: Date;
  }): Promise<void> {
    const alertSentAt = params.alertSentAt ?? new Date();
    const expiresAt = new Date(
      alertSentAt.getTime() + LOW_STOCK_ALERT_CONTEXT_TTL_MS,
    );
    await this.dbService.sqlService.LowStockAlertContext.create({
      phone_number: params.phone,
      factory_id: params.factoryId,
      inventory_item_id: params.inventoryItemId,
      inventory_item_name: params.inventoryItemName,
      alert_sent_at: alertSentAt,
      expires_at: expiresAt,
    });
  }

  async listActiveDistinct(phone: string): Promise<LowStockAlertContextRecord[]> {
    const now = new Date();
    const rows = await this.dbService.sqlService.LowStockAlertContext.findAll({
      where: {
        phone_number: phone,
        expires_at: { [Op.gt]: now },
      },
      order: [
        ['alert_sent_at', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    const seen = new Set<number>();
    const distinct: LowStockAlertContextRecord[] = [];
    for (const row of rows) {
      if (seen.has(row.inventory_item_id)) {
        continue;
      }
      seen.add(row.inventory_item_id);
      distinct.push({
        factory_id: row.factory_id,
        inventory_item_id: row.inventory_item_id,
        inventory_item_name: row.inventory_item_name,
        alert_sent_at: row.alert_sent_at,
        expires_at: row.expires_at,
      });
    }
    return distinct;
  }

  async resolveCtaTitle(phone: string): Promise<LowStockCtaResolution> {
    const active = await this.listActiveDistinct(phone);
    if (active.length === 1) {
      return {
        kind: 'command',
        command: buildPurchaseRequestCreateCommand(active[0].inventory_item_id),
      };
    }
    if (active.length > 1) {
      return {
        kind: 'disambiguation',
        message: this.buildDisambiguationMessage(active),
      };
    }

    const hadExpired = await this.hasExpiredContext(phone);
    if (hadExpired) {
      return {
        kind: 'expired',
        message: LOW_STOCK_CTA_USER_MESSAGES.EXPIRED,
      };
    }
    return {
      kind: 'none',
      message: LOW_STOCK_CTA_USER_MESSAGES.NONE,
    };
  }

  async tryResolveDisambiguationSelection(
    phone: string,
    selection: number,
  ): Promise<string | null> {
    const active = await this.listActiveDistinct(phone);
    if (active.length <= 1) {
      return null;
    }
    if (!Number.isFinite(selection) || selection < 1 || selection > active.length) {
      return null;
    }
    const item = active[selection - 1];
    return buildPurchaseRequestCreateCommand(item.inventory_item_id);
  }

  buildDisambiguationMessage(
    items: Array<{ inventory_item_name: string }>,
  ): string {
    const lines = items.map(
      (item, index) => `${index + 1}. ${item.inventory_item_name}`,
    );
    return (
      'I found multiple low-stock items.\n\n' +
      `${lines.join('\n')}\n\n` +
      'Reply with item number.'
    );
  }

  private async hasExpiredContext(phone: string): Promise<boolean> {
    const now = new Date();
    const count = await this.dbService.sqlService.LowStockAlertContext.count({
      where: {
        phone_number: phone,
        expires_at: { [Op.lte]: now },
      },
    });
    return count > 0;
  }
}
