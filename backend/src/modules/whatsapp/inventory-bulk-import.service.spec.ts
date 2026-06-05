import { BadRequestException } from '@nestjs/common';
import {
  InventoryBulkImportService,
  WA_INVENTORY_CSV_UNSUPPORTED,
} from './inventory-bulk-import.service';
import type { InventoryImportUploadService } from 'src/services/inventory/inventory-import-upload.service';
import type { UserService } from 'src/services/users/users.service';
import { INVENTORY_CSV_MAX_BYTES } from './inventory-csv.constants';
import { USER_ROLE } from 'src/services/users/users.constants';

describe('InventoryBulkImportService', () => {
  const uploadService = {
    uploadCsv: jest.fn(),
  } as unknown as InventoryImportUploadService;

  const usersService = {
    findByPhone: jest.fn(),
  } as unknown as UserService;

  const service = new InventoryBulkImportService(uploadService, usersService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports valid CSV for owner via auto context', async () => {
    (usersService.findByPhone as jest.Mock).mockResolvedValue({
      id: 42,
      factory_links: { factory_id: 1, role: USER_ROLE.OWNER },
    });
    (uploadService.uploadCsv as jest.Mock).mockResolvedValue({
      addedCount: 2,
      updatedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      rowResults: [],
    });

    const csv =
      'sku,name,category,location,unit,quantity\n' +
      'SKU1,Item,Cat,Loc,pcs,1';
    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from(csv, 'utf8'),
      'inventory.csv',
    );

    expect(msg).toContain('✅ Inventory import complete');
    expect(msg).toContain('Added: 2');
    expect(uploadService.uploadCsv).toHaveBeenCalled();
  });

  it('rejects invalid extension', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from('data'),
      'inventory.xlsx',
    );

    expect(msg).toBe(WA_INVENTORY_CSV_UNSUPPORTED);
    expect(uploadService.uploadCsv).not.toHaveBeenCalled();
  });

  it('returns parser error message on parse failure', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);
    (uploadService.uploadCsv as jest.Mock).mockRejectedValue(
      new BadRequestException('Galat CSV format'),
    );

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from('bad', 'utf8'),
      'inventory.csv',
    );

    expect(msg).toContain('❌ CSV file invalid hai');
    expect(msg).toContain('Galat CSV format');
  });

  it('formats partial success summary', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);
    (uploadService.uploadCsv as jest.Mock).mockResolvedValue({
      addedCount: 1,
      updatedCount: 0,
      failedCount: 1,
      skippedCount: 0,
      rowResults: [
        { line: 3, sku: 'BAD', status: 'failed', detail: 'Category missing' },
      ],
    });

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from('sku,name,category,location,unit,quantity\nA,A,C,L,pcs,1', 'utf8'),
      'inventory.csv',
    );

    expect(msg).toContain('⚠️ Inventory import complete');
    expect(msg).toContain('Failed: 1');
    expect(msg).toContain('Kuch rows import nahi ho paayi');
  });

  it('rejects files larger than 2 MB', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);
    const big = Buffer.alloc(INVENTORY_CSV_MAX_BYTES + 1);

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      big,
      'inventory.csv',
    );

    expect(msg).toContain('bahut badi');
    expect(uploadService.uploadCsv).not.toHaveBeenCalled();
  });

  it('detects rejected document types', () => {
    expect(
      service.isRejectedDocumentType({ filename: 'photo.jpg', mimeType: 'image/jpeg' }),
    ).toBe(true);
    expect(
      service.isCsvDocument({ filename: 'stock.csv', mimeType: 'text/csv' }),
    ).toBe(true);
  });
});
