import { Injectable } from '@nestjs/common';
import { DOCUMENT_TYPE, SUGGESTION_TYPE } from './documents.constants';
import { IDocumentTypeContract } from './documents.interfaces';

/**
 * Registry of document type contracts for future LLM parsers.
 * No parser implementation — contracts and suggested actions only.
 */
@Injectable()
export class DocumentRegistry {
  private readonly contracts = new Map<string, IDocumentTypeContract>();

  constructor() {
    this.registerDefaults();
  }

  registerContract(contract: IDocumentTypeContract): void {
    this.contracts.set(contract.documentType, contract);
  }

  getContract(documentType: string): IDocumentTypeContract | undefined {
    return this.contracts.get(documentType);
  }

  listDocumentTypes(): IDocumentTypeContract[] {
    return [...this.contracts.values()];
  }

  isKnownType(documentType: string): boolean {
    return this.contracts.has(documentType);
  }

  private registerDefaults(): void {
    this.registerContract({
      documentType: DOCUMENT_TYPE.PURCHASE_INVOICE,
      description: 'Vendor purchase invoice with line items',
      expectedFields: [
        'vendor_name',
        'invoice_number',
        'invoice_date',
        'items[].item_name',
        'items[].quantity',
        'items[].unit_price',
        'items[].total',
      ],
      suggestedActions: [
        SUGGESTION_TYPE.STOCK_IN,
        SUGGESTION_TYPE.CREATE_VENDOR,
      ],
    });

    this.registerContract({
      documentType: DOCUMENT_TYPE.GOODS_RECEIPT,
      description: 'Goods received note against purchase',
      expectedFields: ['vendor_name', 'items[].name', 'items[].quantity'],
      suggestedActions: [SUGGESTION_TYPE.STOCK_IN],
    });

    this.registerContract({
      documentType: DOCUMENT_TYPE.STOCK_REGISTER,
      description: 'Periodic stock register snapshot',
      expectedFields: ['items[].name', 'items[].quantity'],
      suggestedActions: [
        SUGGESTION_TYPE.STOCK_IN,
        SUGGESTION_TYPE.STOCK_OUT,
        SUGGESTION_TYPE.INVENTORY_ADJUSTMENT,
      ],
    });

    this.registerContract({
      documentType: DOCUMENT_TYPE.INVENTORY_IMPORT,
      description: 'Bulk inventory bootstrap sheet',
      expectedFields: [
        'items[].name',
        'items[].quantity',
        'items[].sku',
        'items[].unit',
      ],
      suggestedActions: [SUGGESTION_TYPE.INITIAL_INVENTORY_IMPORT],
    });

    this.registerContract({
      documentType: DOCUMENT_TYPE.LEDGER_EXPORT,
      description: 'Accounting ledger export',
      expectedFields: ['entries[].description', 'entries[].amount'],
      suggestedActions: [SUGGESTION_TYPE.CREATE_LEDGER_ENTRY],
    });

    this.registerContract({
      documentType: DOCUMENT_TYPE.BANK_STATEMENT,
      description: 'Bank statement for reconciliation',
      expectedFields: ['transactions[].date', 'transactions[].amount'],
      suggestedActions: [SUGGESTION_TYPE.CREATE_LEDGER_ENTRY],
    });
  }
}
