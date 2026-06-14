import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { extname } from 'path';
import type { InboundMediaRef } from 'src/core/messaging/olli-media.service';
import type { InventoryCsvRow } from 'src/modules/whatsapp/inventory-csv.parse';
import type { InventoryImportReview } from 'src/services/inventory/inventory-import.service';
import { InventoryImportUploadService } from 'src/services/inventory/inventory-import-upload.service';
import type { InventoryImportSummary } from 'src/services/inventory/inventory-import.service';
import {
  INVENTORY_CSV_MAX_BYTES,
  INVENTORY_CSV_PENDING_TTL_MS,
  INVENTORY_CSV_REVIEW_TTL_MS,
} from './inventory-csv.constants';

type PendingPhase = 'awaiting_upload' | 'awaiting_confirm' | 'importing';

type PendingCsv = {
  phase: PendingPhase;
  factoryId: number;
  ownerUserId: number;
  expiresAt: number;
  rows?: InventoryCsvRow[];
  review?: InventoryImportReview;
  batchId?: number;
};

const REJECTED_EXTENSIONS = new Set([
  '.xlsx',
  '.xls',
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.doc',
  '.docx',
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
]);

const REJECTED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];

export const WA_INVENTORY_CSV_UNSUPPORTED =
  '❌ Sirf CSV inventory files supported hain.';

export const WA_INVENTORY_IMPORT_REVIEW_EXPIRED =
  'Import review session expired.\n\nPlease upload the CSV again.';

export const WA_INVENTORY_IMPORT_IN_PROGRESS =
  'Import already in progress.';

export const WA_INVENTORY_CSV_NO_SESSION =
  'I detected an inventory CSV.\n\n' +
  'Please send:\n' +
  '/inventory_import_csv\n\n' +
  'before uploading inventory.';

@Injectable()
export class InventoryBulkImportService {
  private readonly logger = new Logger(InventoryBulkImportService.name);
  private readonly pendingByPhone = new Map<string, PendingCsv>();

  constructor(private readonly uploadService: InventoryImportUploadService) {}

  startAwaitingCsv(phone: string, factoryId: number, ownerUserId: number): void {
    this.pendingByPhone.set(phone, {
      phase: 'awaiting_upload',
      factoryId,
      ownerUserId,
      expiresAt: Date.now() + INVENTORY_CSV_PENDING_TTL_MS,
    });
  }

  cancelAwaiting(phone: string): boolean {
    return this.pendingByPhone.delete(phone);
  }

  private getPending(phone: string): PendingCsv | null {
    const pending = this.pendingByPhone.get(phone);
    if (!pending) {
      return null;
    }
    if (Date.now() > pending.expiresAt) {
      this.pendingByPhone.delete(phone);
      return null;
    }
    return pending;
  }

  isAwaitingCsv(phone: string): boolean {
    const pending = this.getPending(phone);
    return pending?.phase === 'awaiting_upload';
  }

  isAwaitingImportConfirm(phone: string): boolean {
    const pending = this.getPending(phone);
    return pending?.phase === 'awaiting_confirm';
  }

  isRejectedDocumentType(media: InboundMediaRef): boolean {
    const ext = extname(media.filename || '').toLowerCase();
    if (REJECTED_EXTENSIONS.has(ext)) {
      return true;
    }
    const mime = (media.mimeType || '').toLowerCase();
    if (REJECTED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
      return true;
    }
    if (
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime === 'application/pdf'
    ) {
      return true;
    }
    return false;
  }

  isCsvDocument(media: InboundMediaRef): boolean {
    if (this.isRejectedDocumentType(media)) {
      return false;
    }
    const ext = extname(media.filename || '').toLowerCase();
    if (ext === '.csv') {
      return true;
    }
    const mime = (media.mimeType || '').toLowerCase();
    return mime === 'text/csv' || mime === 'application/csv' || mime === 'text/plain';
  }

  async importFromCsvBuffer(
    phone: string,
    buffer: Buffer,
    filename?: string,
    mimeType?: string,
    options?: { skipReview?: boolean },
  ): Promise<string> {
    const pending = this.getPending(phone);
    if (pending?.phase === 'importing') {
      return WA_INVENTORY_IMPORT_IN_PROGRESS;
    }
    if (pending?.phase === 'awaiting_confirm') {
      return (
        'Pehle import review complete karein.\n\n' +
        'Reply *CONFIRM* to import.\n' +
        'Reply *CANCEL* to abort.'
      );
    }

    if (!pending) {
      return WA_INVENTORY_CSV_NO_SESSION;
    }

    const ctx = {
      factoryId: pending.factoryId,
      userId: pending.ownerUserId,
    };

    const batchId = this.generateBatchId();
    const startedAt = new Date().toISOString();

    if (buffer.length > INVENTORY_CSV_MAX_BYTES) {
      this.logger.warn({
        event: 'inventory_csv_import_rejected',
        batchId,
        phone,
        factoryId: ctx.factoryId,
        userId: ctx.userId,
        startedAt,
        reason: 'file_too_large',
        sizeBytes: buffer.length,
      });
      return (
        '❌ CSV file bahut badi hai.\n\n' +
        `Maximum ${INVENTORY_CSV_MAX_BYTES / (1024 * 1024)} MB allowed.`
      );
    }

    const name = filename || 'inventory.csv';
    const ext = extname(name).toLowerCase();
    if (REJECTED_EXTENSIONS.has(ext)) {
      return WA_INVENTORY_CSV_UNSUPPORTED;
    }
    if (ext !== '.csv') {
      return WA_INVENTORY_CSV_UNSUPPORTED;
    }

    try {
      const rows = this.uploadService.parseCsvFile({
        originalname: name,
        buffer,
        mimetype: mimeType,
      });

      const useReview = pending != null && !options?.skipReview;

      if (useReview) {
        const review = await this.uploadService.buildImportReview(
          ctx.factoryId,
          rows,
        );

        this.pendingByPhone.set(phone, {
          phase: 'awaiting_confirm',
          factoryId: ctx.factoryId,
          ownerUserId: ctx.userId,
          expiresAt: Date.now() + INVENTORY_CSV_REVIEW_TTL_MS,
          rows,
          review,
          batchId,
        });

        this.logger.log({
          event: 'inventory_csv_import_review_ready',
          batchId,
          phone,
          factoryId: ctx.factoryId,
          userId: ctx.userId,
          newCategories: review.newCategories.length,
          newLocations: review.newLocations.length,
          newItems: review.newItems.length,
        });

        return this.formatReviewMessage(review);
      }

      const summary = await this.uploadService.uploadCsv(
        { originalname: name, buffer, mimetype: mimeType },
        {
          factory_id: ctx.factoryId,
          created_by: ctx.userId,
          batch_id: batchId,
        },
      );

      this.pendingByPhone.delete(phone);
      this.logAudit({
        batchId,
        phone,
        factoryId: ctx.factoryId,
        userId: ctx.userId,
        startedAt,
        summary,
      });

      return this.formatSummary(summary);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        const reason = this.extractErrorMessage(err);
        this.logger.warn({
          event: 'inventory_csv_import_parse_failed',
          batchId,
          phone,
          factoryId: ctx.factoryId,
          userId: ctx.userId,
          startedAt,
          reason,
        });
        return this.formatParserError(reason);
      }
      throw err;
    }
  }

  async handleReviewReply(phone: string, message: string): Promise<string | null> {
    const pending = this.getPending(phone);
    if (pending?.phase === 'importing') {
      return WA_INVENTORY_IMPORT_IN_PROGRESS;
    }
    if (!pending || pending.phase !== 'awaiting_confirm') {
      return null;
    }

    const normalized = message.trim().toLowerCase();

    if (normalized === 'confirm') {
      return this.confirmImport(phone);
    }

    if (normalized === 'cancel') {
      this.pendingByPhone.delete(phone);
      return 'Import cancelled.\n\nNo inventory changes were made.';
    }

    return (
      'Reply *CONFIRM* to create missing records and continue import.\n' +
      'Reply *CANCEL* to abort.'
    );
  }

  async confirmImport(phone: string): Promise<string> {
    const pending = this.getPending(phone);
    if (pending?.phase === 'importing') {
      return WA_INVENTORY_IMPORT_IN_PROGRESS;
    }
    if (!pending || pending.phase !== 'awaiting_confirm') {
      return WA_INVENTORY_IMPORT_REVIEW_EXPIRED;
    }

    if (!pending.rows || !pending.review || !pending.batchId) {
      this.pendingByPhone.delete(phone);
      return WA_INVENTORY_IMPORT_REVIEW_EXPIRED;
    }

    const startedAt = new Date().toISOString();
    const batchId = pending.batchId;
    const snapshot = { ...pending };

    this.pendingByPhone.set(phone, {
      ...pending,
      phase: 'importing',
      expiresAt: Date.now() + INVENTORY_CSV_REVIEW_TTL_MS,
    });

    try {
      const summary = await this.uploadService.processImportWithProvisioning(
        {
          factory_id: snapshot.factoryId,
          created_by: snapshot.ownerUserId,
          batch_id: batchId,
        },
        snapshot.rows!,
        snapshot.review!,
      );

      this.pendingByPhone.delete(phone);
      this.logAudit({
        batchId,
        phone,
        factoryId: snapshot.factoryId,
        userId: snapshot.ownerUserId,
        startedAt,
        summary,
      });

      return this.formatSummary(summary, {
        categoriesCreated: summary.categoriesCreatedCount ?? 0,
        locationsCreated: summary.locationsCreatedCount ?? 0,
      });
    } catch (err: unknown) {
      this.pendingByPhone.delete(phone);
      if (err instanceof BadRequestException) {
        return this.formatParserError(this.extractErrorMessage(err));
      }
      throw err;
    }
  }

  private formatReviewMessage(review: InventoryImportReview): string {
    const lines: string[] = ['*Inventory Import Review*', '', 'I found:'];

    if (review.newCategories.length) {
      lines.push('', '*New Categories:*');
      for (const name of review.newCategories) {
        lines.push(`• ${name}`);
      }
    }

    if (review.existingCategories.length) {
      lines.push('', '*Existing Categories:*');
      for (const name of review.existingCategories) {
        lines.push(`• ${name}`);
      }
    }

    if (review.newLocations.length) {
      lines.push('', '*New Locations:*');
      for (const name of review.newLocations) {
        lines.push(`• ${name}`);
      }
    }

    if (review.existingLocations.length) {
      lines.push('', '*Existing Locations:*');
      for (const name of review.existingLocations) {
        lines.push(`• ${name}`);
      }
    }

    if (review.newItems.length) {
      lines.push('', '*New Inventory Items:*');
      for (const item of review.newItems) {
        lines.push(`• ${item.name}`);
      }
    }

    if (review.existingItems.length) {
      lines.push('', '*Existing Inventory Items:*');
      for (const item of review.existingItems) {
        lines.push(`• ${item.name}`);
      }
    }

    lines.push(
      '',
      'Reply:',
      '',
      '*CONFIRM*',
      'to create missing records and continue import.',
      '',
      '*CANCEL*',
      'to abort.',
    );

    return lines.join('\n');
  }

  private formatSummary(
    summary: InventoryImportSummary,
    extras?: { categoriesCreated: number; locationsCreated: number },
  ): string {
    const header =
      summary.failedCount > 0
        ? '⚠️ Inventory import complete.'
        : '✅ Inventory import complete.';

    let body =
      `\n\nAdded: ${summary.addedCount}\n` +
      `Updated: ${summary.updatedCount}\n` +
      `Failed: ${summary.failedCount}\n` +
      `Skipped: ${summary.skippedCount}`;

    if (extras) {
      body +=
        `\n\nCategories Created: ${extras.categoriesCreated}\n` +
        `Locations Created: ${extras.locationsCreated}\n` +
        `Items Created: ${summary.addedCount}`;
    }

    if (summary.failedCount > 0) {
      body += '\n\nKuch rows import nahi ho paayi.';
      const failed = summary.rowResults.filter((r) => r.status === 'failed');
      const lines = failed.slice(0, 8).map(
        (r) => `• Line ${r.line} (${r.sku}): ${r.detail}`,
      );
      if (lines.length) {
        body += `\n\n${lines.join('\n')}`;
      }
      if (failed.length > 8) {
        body += `\n• ...aur ${failed.length - 8} errors`;
      }
    } else if (!extras) {
      body += '\n\nBatch imported successfully.';
    }

    return `${header}${body}`;
  }

  private formatParserError(reason: string): string {
    return `❌ CSV file invalid hai.\n\nReason:\n${reason}`;
  }

  private extractErrorMessage(err: BadRequestException): string {
    const payload = err.getResponse();
    if (typeof payload === 'string') {
      return payload;
    }
    const msg = (payload as { message?: string | string[] }).message;
    if (Array.isArray(msg)) {
      return msg.join('; ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
    return 'CSV validate nahi ho paayi.';
  }

  private generateBatchId(): number {
    const id = Date.now() % 2_000_000_000;
    return id > 0 ? id : 1;
  }

  private logAudit(params: {
    batchId: number;
    phone: string;
    factoryId: number;
    userId: number;
    startedAt: string;
    summary: InventoryImportSummary;
  }): void {
    this.logger.log({
      event: 'inventory_csv_import_complete',
      batchId: params.batchId,
      phone: params.phone,
      factoryId: params.factoryId,
      userId: params.userId,
      startedAt: params.startedAt,
      completedAt: new Date().toISOString(),
      addedCount: params.summary.addedCount,
      updatedCount: params.summary.updatedCount,
      failedCount: params.summary.failedCount,
      skippedCount: params.summary.skippedCount,
      categoriesCreatedCount: params.summary.categoriesCreatedCount ?? 0,
      locationsCreatedCount: params.summary.locationsCreatedCount ?? 0,
    });
  }
}
