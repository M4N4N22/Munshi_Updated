import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkflowSessionService } from 'src/services/workflow/workflow-session.service';
import {
  SUGGESTION_APPROVAL_STEP,
  WORKFLOW_TYPE,
} from 'src/services/workflow/workflow.constants';
import {
  DOCUMENT_JOB_STATUS,
  DOCUMENT_STATUS,
  DOCUMENT_TYPE,
  EXTRACTION_CONTRACT_VERSION,
  SUGGESTION_STATUS,
} from './documents.constants';
import {
  IDocumentExtractionRecord,
  IDocumentRecord,
  IDocumentSuggestionRecord,
} from './documents.interfaces';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { DocumentRegistry } from './document-registry';
import { DocumentRepository } from './documents.repository';
import {
  CreateDocumentDto,
  StartSuggestionApprovalDto,
  StoreExtractionDto,
} from './documents.dto';
import { SuggestionEngineService } from './suggestion-engine.service';
import { SuggestionExecutionService } from './suggestion-execution.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly registry: DocumentRegistry,
    private readonly contractService: DocumentExtractionContractService,
    private readonly suggestionEngine: SuggestionEngineService,
    private readonly suggestionExecution: SuggestionExecutionService,
    private readonly workflowSessionService: WorkflowSessionService,
  ) {}

  listDocumentTypes() {
    return this.registry.listDocumentTypes();
  }

  async listDocuments(factoryId: number): Promise<IDocumentRecord[]> {
    await this.assertFactoryExists(factoryId);
    const rows = await this.documentRepository.listDocuments(factoryId);
    return rows.map((r) => this.toDocumentRecord(r));
  }

  async getDocument(id: number, factoryId: number): Promise<IDocumentRecord> {
    const row = await this.documentRepository.findDocumentById(id, factoryId);
    if (!row) {
      throw new NotFoundException(`Document #${id} not found`);
    }
    return this.toDocumentRecord(row);
  }

  async createDocument(dto: CreateDocumentDto): Promise<IDocumentRecord> {
    await this.assertFactoryExists(dto.factory_id);

    const docType = dto.document_type ?? DOCUMENT_TYPE.UNKNOWN;
    if (
      docType !== DOCUMENT_TYPE.UNKNOWN &&
      !this.registry.isKnownType(docType)
    ) {
      throw new BadRequestException(`Unknown document type: ${docType}`);
    }

    const row = await this.documentRepository.createDocument({
      factory_id: dto.factory_id,
      uploaded_by: dto.uploaded_by ?? null,
      document_type: docType,
      status: DOCUMENT_STATUS.UPLOADED,
      file_name: dto.file_name ?? null,
      storage_ref: dto.storage_ref ?? null,
      mime_type: dto.mime_type ?? null,
      metadata: dto.metadata ?? {},
    });

    return this.toDocumentRecord(row);
  }

  async storeExtraction(
    documentId: number,
    dto: StoreExtractionDto,
  ): Promise<IDocumentExtractionRecord> {
    const document = await this.documentRepository.findDocumentById(
      documentId,
      dto.factory_id,
    );
    if (!document) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }

    const normalized = this.contractService.validateExtractionPayload(
      dto.payload,
      dto.document_type_detected,
    );

    await this.documentRepository.updateDocument(documentId, dto.factory_id, {
      status: DOCUMENT_STATUS.PROCESSING,
    });

    const job = await this.documentRepository.createJob({
      document_id: documentId,
      factory_id: dto.factory_id,
      job_type: 'EXTRACTION',
      status: DOCUMENT_JOB_STATUS.RUNNING,
      started_at: new Date(),
    });

    try {
      const extraction = await this.documentRepository.createExtraction({
        document_id: documentId,
        factory_id: dto.factory_id,
        extraction_version:
          dto.extraction_version ?? EXTRACTION_CONTRACT_VERSION,
        document_type_detected:
          dto.document_type_detected ??
          normalized.document_type ??
          document.document_type,
        payload: normalized,
      });

      await this.documentRepository.updateJob(job.id, {
        status: DOCUMENT_JOB_STATUS.COMPLETED,
        completed_at: new Date(),
      });

      await this.documentRepository.updateDocument(documentId, dto.factory_id, {
        status: DOCUMENT_STATUS.EXTRACTED,
        document_type:
          dto.document_type_detected ??
          normalized.document_type ??
          document.document_type,
      });

      return this.toExtractionRecord(extraction);
    } catch (error) {
      await this.documentRepository.updateJob(job.id, {
        status: DOCUMENT_JOB_STATUS.FAILED,
        completed_at: new Date(),
        error_message: (error as Error)?.message ?? 'Extraction storage failed',
      });
      await this.documentRepository.updateDocument(documentId, dto.factory_id, {
        status: DOCUMENT_STATUS.FAILED,
      });
      throw error;
    }
  }

  async generateSuggestions(
    documentId: number,
    extractionId: number,
    factoryId: number,
  ) {
    const document = await this.documentRepository.findDocumentById(
      documentId,
      factoryId,
    );
    if (!document) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }

    return this.suggestionEngine.generateFromExtraction(extractionId, factoryId);
  }

  async listSuggestions(
    documentId: number,
    factoryId: number,
  ): Promise<IDocumentSuggestionRecord[]> {
    await this.getDocument(documentId, factoryId);
    const rows = await this.documentRepository.listSuggestions(
      documentId,
      factoryId,
    );
    return rows.map((r) => this.toSuggestionRecord(r));
  }

  async getSuggestion(
    suggestionId: number,
    factoryId: number,
  ): Promise<IDocumentSuggestionRecord> {
    const row = await this.documentRepository.findSuggestionById(
      suggestionId,
      factoryId,
    );
    if (!row) {
      throw new NotFoundException(`Suggestion #${suggestionId} not found`);
    }
    return this.toSuggestionRecord(row);
  }

  async startSuggestionApproval(
    suggestionId: number,
    dto: StartSuggestionApprovalDto,
  ): Promise<{ message: string; workflow_session_id: number }> {
    const suggestion = await this.getSuggestion(suggestionId, dto.factory_id);
    if (suggestion.status !== SUGGESTION_STATUS.PENDING) {
      throw new BadRequestException('Only pending suggestions can enter approval');
    }

    const active = await this.workflowSessionService.getActiveSession(
      dto.phone_number,
    );
    if (active) {
      throw new ConflictException(
        'User already has an active workflow session',
      );
    }

    const session = await this.workflowSessionService.createSession({
      factory_id: dto.factory_id,
      phone_number: dto.phone_number,
      workflow_type: WORKFLOW_TYPE.SUGGESTION_APPROVAL,
      current_step: SUGGESTION_APPROVAL_STEP.CONFIRM,
      session_data: {
        suggestion_id: suggestion.id,
        document_id: suggestion.document_id,
        summary: suggestion.payload.summary,
      },
    });

    await this.documentRepository.updateSuggestion(suggestionId, dto.factory_id, {
      workflow_session_id: session.id,
    });

    return {
      message: String(suggestion.payload.summary ?? 'Please confirm this suggestion.'),
      workflow_session_id: session.id,
    };
  }

  async rejectSuggestion(
    suggestionId: number,
    factoryId: number,
    reason?: string,
  ) {
    return this.suggestionExecution.rejectSuggestion(
      suggestionId,
      factoryId,
      reason,
    );
  }

  private async assertFactoryExists(factoryId: number) {
    const factory = await this.documentRepository.findFactoryById(factoryId);
    if (!factory) {
      throw new NotFoundException(`Factory #${factoryId} not found`);
    }
  }

  private toDocumentRecord(row: any): IDocumentRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      uploaded_by: row.uploaded_by,
      document_type: row.document_type,
      status: row.status,
      file_name: row.file_name,
      storage_ref: row.storage_ref,
      mime_type: row.mime_type,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      created_at: row.created_at,
      updated_at: row.updated_at,
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
