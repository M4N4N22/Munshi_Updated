import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { CreateFromSuggestionDto } from './purchase-requests.dto';
import { IPurchaseRequestSuggestion } from './purchase-requests.interfaces';
import { PurchaseRequestRepository } from './purchase-requests.repository';
import { PurchaseRequestService } from './purchase-requests.service';
import { PurchaseRequestValidationService } from './purchase-requests.validation';
import { PURCHASE_REQUEST_AUDIT_EVENT } from './purchase-requests.constants';

@Injectable()
export class PurchaseRequestSuggestionService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly purchaseRequestService: PurchaseRequestService,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly validationService: PurchaseRequestValidationService,
  ) {}

  async generateLowStockSuggestions(
    factoryId: number,
  ): Promise<IPurchaseRequestSuggestion[]> {
    const lowStock = await this.inventoryService.listLowStockItems(factoryId);
    return lowStock.map((item) => {
      const threshold = Number(item.reorder_threshold ?? 0);
      const current = Number(item.current_quantity);
      const suggested = Math.max(threshold * 2 - current, threshold, 1);
      return {
        suggestion_key: `low-stock:${factoryId}:${item.item_id}`,
        inventory_item_id: item.item_id,
        item_name: item.name,
        sku: item.sku,
        current_quantity: String(item.current_quantity),
        reorder_threshold: item.reorder_threshold ?? null,
        suggested_quantity: String(suggested),
        unit: item.unit,
        reason: `Low stock: ${item.name} (${current} ${item.unit}, reorder at ${item.reorder_threshold ?? 'N/A'})`,
      };
    });
  }

  async createFromSuggestion(
    dto: CreateFromSuggestionDto,
  ) {
    await this.validationService.assertFactoryMember(
      dto.factory_id,
      dto.requested_by,
    );
    const suggestions = await this.generateLowStockSuggestions(dto.factory_id);
    const match = suggestions.find((s) => s.suggestion_key === dto.suggestion_key);
    if (!match) {
      throw new NotFoundException(
        `Suggestion ${dto.suggestion_key} not found or no longer valid`,
      );
    }

    const created = await this.purchaseRequestService.createPurchaseRequest({
      factory_id: dto.factory_id,
      requested_by: dto.requested_by,
      title: dto.title ?? `Restock ${match.item_name}`,
      description: match.reason,
      submit: true,
      items: [
        {
          inventory_item_id: match.inventory_item_id,
          item_name: match.item_name,
          requested_quantity: match.suggested_quantity,
          unit: match.unit,
          notes: match.reason,
        },
      ],
    });

    await this.purchaseRequestRepository.appendAudit(
      created.id,
      PURCHASE_REQUEST_AUDIT_EVENT.SUGGESTION_ACCEPTED,
      dto.requested_by,
      { suggestion_key: dto.suggestion_key, source: 'low_stock' },
    );

    return created;
  }
}
