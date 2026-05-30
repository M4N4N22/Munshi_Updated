import { BadRequestException, Injectable } from '@nestjs/common';
import { DOCUMENT_TYPE } from './documents.constants';
import {
  DocumentExtractionPayload,
  IExtractionInventoryItem,
  IInventoryImportExtractionPayload,
} from './documents.interfaces';
import { DocumentRegistry } from './document-registry';

@Injectable()
export class DocumentExtractionContractService {
  constructor(private readonly registry: DocumentRegistry) {}

  /** Validate extraction payload shape (contract only — no parsing). */
  validateExtractionPayload(
    payload: DocumentExtractionPayload | Record<string, unknown>,
    declaredType?: string,
  ): IInventoryImportExtractionPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Extraction payload must be a JSON object');
    }

    const record = payload as Record<string, unknown>;
    const docType =
      (record.document_type as string) ??
      declaredType ??
      DOCUMENT_TYPE.UNKNOWN;

    if (
      docType === DOCUMENT_TYPE.INVENTORY_IMPORT ||
      docType === DOCUMENT_TYPE.STOCK_REGISTER ||
      this.isInventoryItemsPayload(record)
    ) {
      return this.validateInventoryItemsPayload(record, docType);
    }

    const contract = this.registry.getContract(docType);
    if (!contract && docType !== DOCUMENT_TYPE.UNKNOWN) {
      throw new BadRequestException(`Unknown document type contract: ${docType}`);
    }

    return this.validateInventoryItemsPayload(record, docType);
  }

  private isInventoryItemsPayload(payload: Record<string, unknown>): boolean {
    return Array.isArray(payload.items);
  }

  private validateInventoryItemsPayload(
    payload: Record<string, unknown>,
    docType: string,
  ): IInventoryImportExtractionPayload {
    const items = payload.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException(
        'Extraction payload must include a non-empty items array',
      );
    }

    const normalized: IExtractionInventoryItem[] = items.map((raw, idx) => {
      const item = raw as Record<string, unknown>;
      const name = String(item.name ?? item.item_name ?? '').trim();
      if (!name) {
        throw new BadRequestException(`items[${idx}].name is required`);
      }
      const quantity =
        item.quantity != null ? Number(item.quantity) : undefined;
      if (quantity != null && (!Number.isFinite(quantity) || quantity < 0)) {
        throw new BadRequestException(`items[${idx}].quantity must be non-negative`);
      }
      return {
        name,
        quantity,
        sku: item.sku ? String(item.sku).trim() : undefined,
        unit: item.unit ? String(item.unit).trim() : undefined,
        category_name: item.category_name
          ? String(item.category_name).trim()
          : undefined,
        location_name: item.location_name
          ? String(item.location_name).trim()
          : undefined,
      };
    });

    return {
      document_type: docType,
      items: normalized,
    };
  }
}
