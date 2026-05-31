import { Injectable, Logger } from '@nestjs/common';
import { DocumentRepository } from './documents.repository';
import { DOCUMENT_JOB_STATUS } from './documents.constants';

export interface ExtractionAuditEntry {
  document_id: number;
  factory_id: number;
  job_id?: number;
  valid: boolean;
  document_type?: string;
  error_message?: string;
  payload_preview?: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class ExtractionAuditService {
  private readonly logger = new Logger(ExtractionAuditService.name);

  constructor(private readonly repository: DocumentRepository) {}

  async logValidationResult(entry: Omit<ExtractionAuditEntry, 'created_at'>) {
    const record: ExtractionAuditEntry = {
      ...entry,
      created_at: new Date().toISOString(),
    };

    if (!entry.valid) {
      this.logger.warn(
        `Extraction validation failed doc=${entry.document_id} factory=${entry.factory_id}: ${entry.error_message}`,
      );
      if (entry.job_id) {
        await this.repository.updateJob(entry.job_id, {
          status: DOCUMENT_JOB_STATUS.FAILED,
          completed_at: new Date(),
          error_message: entry.error_message,
        });
      }
    } else {
      this.logger.log(
        `Extraction validated doc=${entry.document_id} type=${entry.document_type}`,
      );
    }

    if (entry.document_id && entry.factory_id) {
      const doc = await this.repository.findDocumentById(
        entry.document_id,
        entry.factory_id,
      );
      if (doc) {
        const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
        const auditLog = Array.isArray(metadata.extraction_audit)
          ? (metadata.extraction_audit as ExtractionAuditEntry[])
          : [];
        auditLog.push(record);
        await this.repository.updateDocument(entry.document_id, entry.factory_id, {
          metadata: { ...metadata, extraction_audit: auditLog.slice(-20) },
        });
      }
    }

    return record;
  }
}
