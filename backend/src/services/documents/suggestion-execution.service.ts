import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { InventoryRepository } from 'src/services/inventory/inventory.repository';
import {
  normalizeInventoryName,
  normalizeSku,
  normalizeUnit,
} from 'src/services/inventory/inventory.validation';
import {
  DOCUMENT_STATUS,
  SUGGESTION_STATUS,
  SUGGESTION_TYPE,
} from './documents.constants';
import {
  IDocumentSuggestionRecord,
  IExtractionInventoryItem,
} from './documents.interfaces';
import { DocumentRepository } from './documents.repository';

export interface ExecuteSuggestionInput {
  suggestionId: number;
  factoryId: number;
  userId?: number;
}

@Injectable()
export class SuggestionExecutionService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly inventoryService: InventoryService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  async executeApprovedSuggestion(
    input: ExecuteSuggestionInput,
  ): Promise<IDocumentSuggestionRecord> {
    const row = await this.documentRepository.findSuggestionById(
      input.suggestionId,
      input.factoryId,
    );
    if (!row) {
      throw new NotFoundException(`Suggestion #${input.suggestionId} not found`);
    }

    const suggestion = this.toRecord(row);
    if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
      throw new BadRequestException(
        `Suggestion #${input.suggestionId} is not pending approval`,
      );
    }

    try {
      switch (suggestion.suggestion_type) {
        case SUGGESTION_TYPE.INITIAL_INVENTORY_IMPORT:
          await this.executeInitialImport(
            input.factoryId,
            suggestion,
            input.userId,
          );
          break;
        case SUGGESTION_TYPE.NEW_INVENTORY_ITEM:
          await this.executeNewItem(
            input.factoryId,
            suggestion,
            input.userId,
          );
          break;
        case SUGGESTION_TYPE.STOCK_IN:
          await this.executeStockIn(
            input.factoryId,
            suggestion,
            input.userId,
          );
          break;
        default:
          throw new BadRequestException(
            `Suggestion type ${suggestion.suggestion_type} is not executable yet`,
          );
      }

      await this.documentRepository.updateSuggestion(
        suggestion.id,
        input.factoryId,
        {
          status: SUGGESTION_STATUS.EXECUTED,
          executed_at: new Date(),
        },
      );

      await this.refreshDocumentStatus(suggestion.document_id, input.factoryId);

      const updated = await this.documentRepository.findSuggestionById(
        suggestion.id,
        input.factoryId,
      );
      return this.toRecord(updated!);
    } catch (error: any) {
      await this.documentRepository.updateSuggestion(
        suggestion.id,
        input.factoryId,
        { status: SUGGESTION_STATUS.FAILED },
      );
      throw error;
    }
  }

  async rejectSuggestion(
    suggestionId: number,
    factoryId: number,
    reason?: string,
  ): Promise<IDocumentSuggestionRecord> {
    const row = await this.documentRepository.findSuggestionById(
      suggestionId,
      factoryId,
    );
    if (!row) {
      throw new NotFoundException(`Suggestion #${suggestionId} not found`);
    }

    await this.documentRepository.updateSuggestion(suggestionId, factoryId, {
      status: SUGGESTION_STATUS.REJECTED,
      rejection_reason: reason ?? 'Rejected by user',
    });

    await this.refreshDocumentStatus(row.document_id, factoryId);

    const updated = await this.documentRepository.findSuggestionById(
      suggestionId,
      factoryId,
    );
    return this.toRecord(updated!);
  }

  private async executeInitialImport(
    factoryId: number,
    suggestion: IDocumentSuggestionRecord,
    userId?: number,
  ): Promise<void> {
    const items = (suggestion.payload.items ?? []) as IExtractionInventoryItem[];
    if (!items.length) {
      throw new BadRequestException('Initial import suggestion has no items');
    }

    const { categoryId, locationId } =
      await this.resolveDefaultCategoryAndLocation(factoryId);

    for (const item of items) {
      const created = await this.inventoryService.createItem({
        factory_id: factoryId,
        category_id: categoryId,
        location_id: locationId,
        sku: item.sku ? normalizeSku(item.sku) : this.deriveSku(item.name),
        name: normalizeInventoryName(item.name, 'Item name'),
        unit: normalizeUnit(item.unit ?? 'units'),
      });

      if (item.quantity != null && item.quantity > 0) {
        await this.inventoryTransactionService.recordStockIn({
          factory_id: factoryId,
          inventory_item_id: created.id,
          quantity: item.quantity,
          notes: 'Initial inventory import from document',
          reference_type: 'DOCUMENT_SUGGESTION',
          reference_id: suggestion.id,
          created_by: userId ?? null,
        });
      }
    }
  }

  private async executeNewItem(
    factoryId: number,
    suggestion: IDocumentSuggestionRecord,
    userId?: number,
  ): Promise<void> {
    const item = suggestion.payload.item as IExtractionInventoryItem | undefined;
    if (!item?.name) {
      throw new BadRequestException('New item suggestion is missing item.name');
    }

    const { categoryId, locationId } =
      await this.resolveDefaultCategoryAndLocation(factoryId);

    const created = await this.inventoryService.createItem({
      factory_id: factoryId,
      category_id: categoryId,
      location_id: locationId,
      sku: item.sku ? normalizeSku(item.sku) : this.deriveSku(item.name),
      name: normalizeInventoryName(item.name, 'Item name'),
      unit: normalizeUnit(item.unit ?? 'units'),
    });

    if (item.quantity != null && item.quantity > 0) {
      await this.inventoryTransactionService.recordStockIn({
        factory_id: factoryId,
        inventory_item_id: created.id,
        quantity: item.quantity,
        notes: 'Stock in from document suggestion',
        reference_type: 'DOCUMENT_SUGGESTION',
        reference_id: suggestion.id,
        created_by: userId ?? null,
      });
    }
  }

  private async executeStockIn(
    factoryId: number,
    suggestion: IDocumentSuggestionRecord,
    userId?: number,
  ): Promise<void> {
    const item = suggestion.payload.item as IExtractionInventoryItem | undefined;
    if (!item?.name) {
      throw new BadRequestException('Stock-in suggestion is missing item.name');
    }
    if (item.quantity == null || item.quantity <= 0) {
      throw new BadRequestException('Stock-in suggestion requires positive quantity');
    }

    const inventoryItem = item.sku
      ? await this.inventoryRepository.findItemBySku(
          factoryId,
          normalizeSku(item.sku),
        )
      : await this.inventoryRepository.findItemByName(factoryId, item.name);

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item "${item.name}" not found`);
    }

    await this.inventoryTransactionService.recordStockIn({
      factory_id: factoryId,
      inventory_item_id: inventoryItem.id,
      quantity: item.quantity,
      notes: 'Stock in from document suggestion',
      reference_type: 'DOCUMENT_SUGGESTION',
      reference_id: suggestion.id,
      created_by: userId ?? null,
    });
  }

  private async resolveDefaultCategoryAndLocation(
    factoryId: number,
  ): Promise<{ categoryId: number; locationId: number }> {
    let category = await this.inventoryRepository.findCategoryByName(
      factoryId,
      'Imported',
    );
    if (!category) {
      category = await this.inventoryRepository.createCategory({
        factory_id: factoryId,
        name: 'Imported',
        description: 'Auto-created for document imports',
        is_active: true,
      });
    }

    let location = await this.inventoryRepository.findLocationByName(
      factoryId,
      'Default',
    );
    if (!location) {
      location = await this.inventoryRepository.createLocation({
        factory_id: factoryId,
        name: 'Default',
        code: 'DEFAULT',
        is_active: true,
      });
    }

    return { categoryId: category.id, locationId: location.id };
  }

  private deriveSku(name: string): string {
    const base =
      name
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8) || 'ITEM';
    return `${base}${Date.now().toString().slice(-4)}`;
  }

  private async refreshDocumentStatus(
    documentId: number,
    factoryId: number,
  ): Promise<void> {
    const suggestions = await this.documentRepository.listSuggestions(
      documentId,
      factoryId,
    );
    const allTerminal = suggestions.every((s) =>
      [
        SUGGESTION_STATUS.EXECUTED,
        SUGGESTION_STATUS.REJECTED,
        SUGGESTION_STATUS.FAILED,
      ].includes(s.status as any),
    );
    const anyExecuted = suggestions.some(
      (s) => s.status === SUGGESTION_STATUS.EXECUTED,
    );
    const allRejected = suggestions.every(
      (s) => s.status === SUGGESTION_STATUS.REJECTED,
    );

    if (allRejected) {
      await this.documentRepository.updateDocument(documentId, factoryId, {
        status: DOCUMENT_STATUS.REJECTED,
      });
    } else if (allTerminal && anyExecuted) {
      await this.documentRepository.updateDocument(documentId, factoryId, {
        status: DOCUMENT_STATUS.APPROVED,
      });
    }
  }

  private toRecord(row: any): IDocumentSuggestionRecord {
    return {
      id: row.id,
      document_id: row.document_id,
      factory_id: row.factory_id,
      extraction_id: row.extraction_id,
      suggestion_type: row.suggestion_type,
      status: row.status,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      workflow_session_id: row.workflow_session_id,
      rejection_reason: row.rejection_reason,
      executed_at: row.executed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
