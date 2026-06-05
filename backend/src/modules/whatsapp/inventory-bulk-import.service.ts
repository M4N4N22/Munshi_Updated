import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { extname } from 'path';
import type { InboundMediaRef } from 'src/core/messaging/olli-media.service';
import { InventoryImportUploadService } from 'src/services/inventory/inventory-import-upload.service';
import type { InventoryImportSummary } from 'src/services/inventory/inventory-import.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { UserService } from 'src/services/users/users.service';
import {
  INVENTORY_CSV_MAX_BYTES,
  INVENTORY_CSV_PENDING_TTL_MS,
} from './inventory-csv.constants';

type PendingCsv = {
  factoryId: number;
  ownerUserId: number;
  expiresAt: number;
};

type ImportContext = {
  factoryId: number;
  userId: number;
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

@Injectable()
export class InventoryBulkImportService {
  private readonly logger = new Logger(InventoryBulkImportService.name);
  private readonly pendingByPhone = new Map<string, PendingCsv>();

  constructor(
    private readonly uploadService: InventoryImportUploadService,
    private readonly usersService: UserService,
  ) {}

  startAwaitingCsv(phone: string, factoryId: number, ownerUserId: number): void {
    this.pendingByPhone.set(phone, {
      factoryId,
      ownerUserId,
      expiresAt: Date.now() + INVENTORY_CSV_PENDING_TTL_MS,
    });
  }

  cancelAwaiting(phone: string): boolean {
    return this.pendingByPhone.delete(phone);
  }

  isAwaitingCsv(phone: string): boolean {
    const pending = this.pendingByPhone.get(phone);
    if (!pending) {
      return false;
    }
    if (Date.now() > pending.expiresAt) {
      this.pendingByPhone.delete(phone);
      return false;
    }
    return true;
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

  async canAutoImport(phone: string): Promise<boolean> {
    const ctx = await this.resolveOwnerManagerContext(phone);
    return ctx != null;
  }

  async importFromCsvBuffer(
    phone: string,
    buffer: Buffer,
    filename?: string,
    mimeType?: string,
  ): Promise<string> {
    const ctx = this.resolvePendingContext(phone) ??
      (await this.resolveOwnerManagerContext(phone));

    if (!ctx) {
      return (
        `${WA_INVENTORY_CSV_UNSUPPORTED}\n\n` +
        'Inventory CSV import sirf owner/manager kar sakte hain.'
      );
    }

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

  private resolvePendingContext(phone: string): ImportContext | null {
    if (!this.isAwaitingCsv(phone)) {
      return null;
    }
    const pending = this.pendingByPhone.get(phone);
    if (!pending) {
      return null;
    }
    return {
      factoryId: pending.factoryId,
      userId: pending.ownerUserId,
    };
  }

  private async resolveOwnerManagerContext(
    phone: string,
  ): Promise<ImportContext | null> {
    const user = await this.usersService.findByPhone(phone);
    if (!user?.id) {
      return null;
    }
    const factoryId = user.factory_links?.factory_id;
    const role = (user.factory_links?.role || '').toUpperCase();
    if (!factoryId) {
      return null;
    }
    if (role !== USER_ROLE.OWNER && role !== USER_ROLE.MANAGER) {
      return null;
    }
    return { factoryId, userId: user.id };
  }

  private formatSummary(summary: InventoryImportSummary): string {
    const header =
      summary.failedCount > 0
        ? '⚠️ Inventory import complete.'
        : '✅ Inventory import complete.';

    let body =
      `\n\nAdded: ${summary.addedCount}\n` +
      `Updated: ${summary.updatedCount}\n` +
      `Failed: ${summary.failedCount}\n` +
      `Skipped: ${summary.skippedCount}`;

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
    } else {
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
    });
  }
}
