import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { DOCUMENT_TYPES } from '../../../contracts/typescript/index';
import { DocumentExtractionContractService } from './document-extraction-contract.service';
import { ExtractionAuditService } from './extraction-audit.service';
import { DocumentExtractionPayload } from './documents.interfaces';

@Injectable()
export class ContractValidationService {
  constructor(
    private readonly extractionContract: DocumentExtractionContractService,
    private readonly audit: ExtractionAuditService,
  ) {}

  validateAndNormalize(
    payload: DocumentExtractionPayload | Record<string, unknown>,
    declaredType?: string,
    auditContext?: {
      document_id: number;
      factory_id: number;
      job_id?: number;
    },
  ) {
    const docType =
      (payload as Record<string, unknown>).document_type ??
      declaredType ??
      'UNKNOWN';

    if (
      docType !== 'UNKNOWN' &&
      !DOCUMENT_TYPES.includes(docType as (typeof DOCUMENT_TYPES)[number])
    ) {
      const msg = `Unknown document type: ${docType}`;
      this.auditFailure(auditContext, String(docType), msg, payload);
      throw new BadRequestException(msg);
    }

    try {
      const normalized = this.extractionContract.validateExtractionPayload(
        payload,
        declaredType,
      );
      if (auditContext) {
        void this.audit.logValidationResult({
          document_id: auditContext.document_id,
          factory_id: auditContext.factory_id,
          job_id: auditContext.job_id,
          valid: true,
          document_type: normalized.document_type ?? String(docType),
          payload_preview: { item_count: normalized.items.length },
        });
      }
      return normalized;
    } catch (error: any) {
      const msg = error?.message ?? 'Contract validation failed';
      this.auditFailure(auditContext, String(docType), msg, payload);
      throw error;
    }
  }

  private auditFailure(
    auditContext:
      | { document_id: number; factory_id: number; job_id?: number }
      | undefined,
    docType: string,
    msg: string,
    payload: unknown,
  ) {
    if (!auditContext) return;
    void this.audit.logValidationResult({
      document_id: auditContext.document_id,
      factory_id: auditContext.factory_id,
      job_id: auditContext.job_id,
      valid: false,
      document_type: docType,
      error_message: msg,
      payload_preview:
        payload && typeof payload === 'object'
          ? (payload as Record<string, unknown>)
          : undefined,
    });
  }
}
