import { Injectable } from '@nestjs/common';
import { InventoryRepository } from 'src/services/inventory/inventory.repository';
import {
  DOCUMENT_TYPE,
  SUGGESTION_TYPE,
} from './documents.constants';
import {
  IDocumentExtractionRecord,
  IDocumentSuggestionRecord,
  IExtractionInventoryItem,
  IInventoryImportExtractionPayload,
  ISuggestionPayload,
} from './documents.interfaces';
import { DocumentRepository } from './documents.repository';

export interface GeneratedSuggestionInput {
  document_id: number;
  factory_id: number;
  extraction_id: number;
  suggestion_type: string;
  payload: ISuggestionPayload;
}

@Injectable()
export class InventorySuggestionProcessor {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async generateFromExtraction(
    extraction: IDocumentExtractionRecord,
    normalized: IInventoryImportExtractionPayload,
  ): Promise<GeneratedSuggestionInput[]> {
    const factoryId = extraction.factory_id;
    const existingItems = await this.inventoryRepository.listItems(factoryId, {
      activeOnly: true,
      page_size: 500,
    });
    const itemByName = new Map<string, { id: number; sku: string }>();
    const itemBySku = new Map<string, { id: number; name: string }>();
    for (const row of existingItems.rows) {
      itemByName.set(row.name.trim().toLowerCase(), {
        id: row.id,
        sku: row.sku,
      });
      itemBySku.set(row.sku.trim().toUpperCase(), {
        id: row.id,
        name: row.name,
      });
    }

    const isEmpty = existingItems.count === 0;
    const docType =
      normalized.document_type ??
      extraction.document_type_detected ??
      DOCUMENT_TYPE.UNKNOWN;

    if (
      isEmpty &&
      (docType === DOCUMENT_TYPE.INVENTORY_IMPORT ||
        docType === DOCUMENT_TYPE.STOCK_REGISTER ||
        normalized.items.length > 0)
    ) {
      return [
        this.buildInitialImportSuggestion(
          extraction,
          normalized.items,
        ),
      ];
    }

    const suggestions: GeneratedSuggestionInput[] = [];
    for (const item of normalized.items) {
      const match = this.findExistingItem(item, itemByName, itemBySku);
      if (!match) {
        suggestions.push(
          this.buildNewItemSuggestion(extraction, item),
        );
      } else if (item.quantity != null && item.quantity > 0) {
        suggestions.push(
          this.buildStockInSuggestion(extraction, item, match.id),
        );
      }
    }

    return suggestions;
  }

  private findExistingItem(
    item: IExtractionInventoryItem,
    itemByName: Map<string, { id: number; sku: string }>,
    itemBySku: Map<string, { id: number; name: string }>,
  ): { id: number } | null {
    if (item.sku) {
      const bySku = itemBySku.get(item.sku.trim().toUpperCase());
      if (bySku) {
        return { id: bySku.id };
      }
    }
    const byName = itemByName.get(item.name.trim().toLowerCase());
    if (byName) {
      return { id: byName.id };
    }
    return null;
  }

  private buildInitialImportSuggestion(
    extraction: IDocumentExtractionRecord,
    items: IExtractionInventoryItem[],
  ): GeneratedSuggestionInput {
    const lines = items
      .map((i) => `• *${i.name}* — ${i.quantity ?? 0}`)
      .join('\n');

    return {
      document_id: extraction.document_id,
      factory_id: extraction.factory_id,
      extraction_id: extraction.id,
      suggestion_type: SUGGESTION_TYPE.INITIAL_INVENTORY_IMPORT,
      payload: {
        summary: `We detected the following inventory:\n\n${lines}\n\nIs this your inventory? Reply *YES* or *NO*.`,
        items: items.map((i) => ({ ...i })),
        document_id: extraction.document_id,
        extraction_id: extraction.id,
      },
    };
  }

  private buildNewItemSuggestion(
    extraction: IDocumentExtractionRecord,
    item: IExtractionInventoryItem,
  ): GeneratedSuggestionInput {
    return {
      document_id: extraction.document_id,
      factory_id: extraction.factory_id,
      extraction_id: extraction.id,
      suggestion_type: SUGGESTION_TYPE.NEW_INVENTORY_ITEM,
      payload: {
        summary:
          `New inventory item detected:\n\n*${item.name}*` +
          (item.quantity != null ? ` — qty ${item.quantity}` : '') +
          `\n\nCreate inventory item? Reply *YES* or *NO*.`,
        item: { ...item },
        document_id: extraction.document_id,
        extraction_id: extraction.id,
      },
    };
  }

  private buildStockInSuggestion(
    extraction: IDocumentExtractionRecord,
    item: IExtractionInventoryItem,
    _itemId: number,
  ): GeneratedSuggestionInput {
    return {
      document_id: extraction.document_id,
      factory_id: extraction.factory_id,
      extraction_id: extraction.id,
      suggestion_type: SUGGESTION_TYPE.STOCK_IN,
      payload: {
        summary:
          `Stock-in suggested for *${item.name}* — quantity ${item.quantity}.\n\nReply *YES* or *NO* to approve.`,
        item: { ...item },
        document_id: extraction.document_id,
        extraction_id: extraction.id,
      },
    };
  }
}
