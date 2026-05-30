import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DOCUMENT_STATUS,
  SUGGESTION_STATUS,
} from './documents.constants';
import {
  IDocumentExtractionRecord,
  IDocumentSuggestionRecord,
  IInventoryImportExtractionPayload,
  ISuggestionGenerationResult,
} from './documents.interfaces';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { DocumentRepository } from './documents.repository';
import {
  GeneratedSuggestionInput,
  InventorySuggestionProcessor,
} from './inventory-suggestion.processor';

@Injectable()
export class SuggestionEngineService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly contractService: DocumentExtractionContractService,
    private readonly inventoryProcessor: InventorySuggestionProcessor,
  ) {}

  async generateFromExtraction(
    extractionId: number,
    factoryId: number,
  ): Promise<ISuggestionGenerationResult> {
    const extraction = await this.documentRepository.findExtractionById(
      extractionId,
      factoryId,
    );
    if (!extraction) {
      throw new NotFoundException(`Extraction #${extractionId} not found`);
    }

    const record = this.toExtractionRecord(extraction);
    const normalized = this.contractService.validateExtractionPayload(
      record.payload,
      record.document_type_detected ?? undefined,
    );

    const inputs = await this.inventoryProcessor.generateFromExtraction(
      record,
      normalized,
    );

    const suggestions: IDocumentSuggestionRecord[] = [];
    for (const input of inputs) {
      const row = await this.documentRepository.createSuggestion({
        document_id: input.document_id,
        factory_id: input.factory_id,
        extraction_id: input.extraction_id,
        suggestion_type: input.suggestion_type,
        status: SUGGESTION_STATUS.PENDING,
        payload: input.payload,
      });
      suggestions.push(this.toSuggestionRecord(row));
    }

    await this.documentRepository.updateDocument(
      record.document_id,
      factoryId,
      { status: DOCUMENT_STATUS.SUGGESTED },
    );

    return {
      suggestions,
      documentStatus: DOCUMENT_STATUS.SUGGESTED,
    };
  }

  private toExtractionRecord(row: any): IDocumentExtractionRecord {
    return {
      id: row.id,
      document_id: row.document_id,
      factory_id: row.factory_id,
      extraction_version: row.extraction_version,
      document_type_detected: row.document_type_detected,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      created_at: row.created_at,
    };
  }

  private toSuggestionRecord(row: any): IDocumentSuggestionRecord {
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
