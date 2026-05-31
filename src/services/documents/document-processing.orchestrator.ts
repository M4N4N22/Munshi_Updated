import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DOCUMENT_JOB_STATUS,
  DOCUMENT_STATUS,
  EXTRACTION_CONTRACT_VERSION,
} from './documents.constants';
import { DocumentRepository } from './documents.repository';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { MlParserAdapter } from './parser/ml-parser.adapter';
import { ContractValidationService } from './contract-validation.service';
import { SuggestionEngineService } from './suggestion-engine.service';
import { SuggestionQueueService } from './suggestion-queue.service';
import { SuggestionWorkflowTriggerService } from './suggestion-workflow-trigger.service';

export interface OrchestrationResult {
  document_id: number;
  extraction_id: number;
  suggestion_ids: number[];
  workflow_started: boolean;
  warnings?: string[];
}

@Injectable()
export class DocumentProcessingOrchestrator {
  private readonly logger = new Logger(DocumentProcessingOrchestrator.name);

  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: LocalStorageProvider,
    private readonly parser: MlParserAdapter,
    private readonly contractValidation: ContractValidationService,
    private readonly suggestionEngine: SuggestionEngineService,
    private readonly queueService: SuggestionQueueService,
    private readonly workflowTrigger: SuggestionWorkflowTriggerService,
  ) {}

  async processDocument(
    documentId: number,
    factoryId: number,
  ): Promise<OrchestrationResult> {
    const document = await this.repository.findDocumentById(
      documentId,
      factoryId,
    );
    if (!document) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }
    if (!document.storage_ref) {
      throw new NotFoundException(`Document #${documentId} has no storage_ref`);
    }

    const runningJob = await this.repository.createJob({
      document_id: documentId,
      factory_id: factoryId,
      job_type: 'INGEST_PARSE',
      status: DOCUMENT_JOB_STATUS.RUNNING,
      started_at: new Date(),
    });

    await this.repository.updateDocument(documentId, factoryId, {
      status: DOCUMENT_STATUS.PROCESSING,
    });

    try {
      const buffer = await this.storage.read(document.storage_ref);
      const parseResult = await this.parser.parse({
        factoryId,
        fileName: document.file_name ?? 'upload.bin',
        mimeType: document.mime_type ?? 'application/octet-stream',
        buffer,
        documentType: document.document_type,
      });

      const normalized = this.contractValidation.validateAndNormalize(
        parseResult.payload,
        parseResult.document_type_detected,
        {
          document_id: documentId,
          factory_id: factoryId,
          job_id: runningJob.id,
        },
      );

      const docType =
        parseResult.document_type_detected ??
        normalized.document_type ??
        document.document_type;

      const extraction = await this.repository.createExtraction({
        document_id: documentId,
        factory_id: factoryId,
        extraction_version: EXTRACTION_CONTRACT_VERSION,
        document_type_detected: docType,
        payload: normalized,
      });

      await this.repository.updateDocument(documentId, factoryId, {
        status: DOCUMENT_STATUS.EXTRACTED,
        document_type: docType,
      });

      await this.repository.updateJob(runningJob.id, {
        status: DOCUMENT_JOB_STATUS.COMPLETED,
        completed_at: new Date(),
      });

      const suggestionResult = await this.suggestionEngine.generateFromExtraction(
        extraction.id,
        factoryId,
      );

      const suggestionIds = suggestionResult.suggestions.map((s) => s.id);
      await this.queueService.initializeQueue(
        documentId,
        factoryId,
        suggestionIds,
      );

      const trigger = await this.workflowTrigger.startQueueForDocument(
        documentId,
        factoryId,
      );

      return {
        document_id: documentId,
        extraction_id: extraction.id,
        suggestion_ids: suggestionIds,
        workflow_started: trigger.started === true,
        warnings: parseResult.warnings,
      };
    } catch (error: any) {
      this.logger.error(
        `Orchestration failed doc=${documentId}: ${error?.message}`,
      );
      await this.repository.updateJob(runningJob.id, {
        status: DOCUMENT_JOB_STATUS.FAILED,
        completed_at: new Date(),
        error_message: error?.message ?? 'Orchestration failed',
      });
      await this.repository.updateDocument(documentId, factoryId, {
        status: DOCUMENT_STATUS.FAILED,
      });
      throw error;
    }
  }
}
