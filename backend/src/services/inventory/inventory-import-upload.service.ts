import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { parseInventoryCsvText } from 'src/modules/whatsapp/inventory-csv.parse';
import { INVENTORY_CSV_MAX_BYTES } from 'src/modules/whatsapp/inventory-csv.constants';
import { ImportInventoryCsvDto } from './inventory.dto';
import type { InventoryCsvRow } from 'src/modules/whatsapp/inventory-csv.parse';
import {
  InventoryImportReview,
  InventoryImportService,
  InventoryImportSummary,
} from './inventory-import.service';

export type InventoryCsvUploadFile = {
  originalname: string;
  buffer: Buffer;
  mimetype?: string;
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
]);

@Injectable()
export class InventoryImportUploadService {
  constructor(private readonly importService: InventoryImportService) {}

  parseCsvFile(file: InventoryCsvUploadFile | undefined): InventoryCsvRow[] {
    this.assertCsvFile(file);
    const text = file!.buffer.toString('utf8');
    const parsed = parseInventoryCsvText(text);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.error);
    }
    return parsed.rows;
  }

  async buildImportReview(
    factoryId: number,
    rows: InventoryCsvRow[],
  ): Promise<InventoryImportReview> {
    return this.importService.buildImportReview(factoryId, rows);
  }

  async processImportWithProvisioning(
    dto: ImportInventoryCsvDto,
    rows: InventoryCsvRow[],
    review: InventoryImportReview,
  ): Promise<InventoryImportSummary> {
    const batchId = dto.batch_id ?? this.generateBatchId();

    try {
      const provision = await this.importService.ensureMasterData(
        dto.factory_id,
        review.newCategories,
        review.newLocations,
      );

      const summary = await this.importService.processImport(
        dto.factory_id,
        dto.created_by,
        rows,
        batchId,
      );

      return {
        ...summary,
        categoriesCreatedCount: provision.categoriesCreated,
        locationsCreatedCount: provision.locationsCreated,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found')) {
        throw new NotFoundException(msg);
      }
      throw err;
    }
  }

  async uploadCsv(
    file: InventoryCsvUploadFile | undefined,
    dto: ImportInventoryCsvDto,
  ): Promise<InventoryImportSummary> {
    const rows = this.parseCsvFile(file);
    const batchId = dto.batch_id ?? this.generateBatchId();

    try {
      return await this.importService.processImport(
        dto.factory_id,
        dto.created_by,
        rows,
        batchId,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found')) {
        throw new NotFoundException(msg);
      }
      throw err;
    }
  }

  private assertCsvFile(file: InventoryCsvUploadFile | undefined): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }

    if (file.buffer.length > INVENTORY_CSV_MAX_BYTES) {
      throw new BadRequestException(
        `CSV file bahut badi hai. Maximum ${INVENTORY_CSV_MAX_BYTES / (1024 * 1024)} MB allowed.`,
      );
    }

    const ext = extname(file.originalname || '').toLowerCase();
    if (REJECTED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `File type not allowed. Sirf .csv files upload karein.`,
      );
    }
    if (ext !== '.csv') {
      throw new BadRequestException(
        `Sirf .csv files allowed. Received: "${ext || file.originalname || 'unknown'}".`,
      );
    }
  }

  private generateBatchId(): number {
    const id = Date.now() % 2_000_000_000;
    return id > 0 ? id : 1;
  }
}
