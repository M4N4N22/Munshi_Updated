import { BadRequestException } from '@nestjs/common';
import {
  InventoryBulkImportService,
  WA_INVENTORY_CSV_UNSUPPORTED,
  WA_INVENTORY_IMPORT_REVIEW_EXPIRED,
} from './inventory-bulk-import.service';
import type { InventoryImportUploadService } from 'src/services/inventory/inventory-import-upload.service';
import type { UserService } from 'src/services/users/users.service';
import {
  INVENTORY_CSV_MAX_BYTES,
  INVENTORY_CSV_REVIEW_TTL_MS,
} from './inventory-csv.constants';
import { USER_ROLE } from 'src/services/users/users.constants';

describe('InventoryBulkImportService', () => {
  const uploadService = {
    uploadCsv: jest.fn(),
    parseCsvFile: jest.fn(),
    buildImportReview: jest.fn(),
    processImportWithProvisioning: jest.fn(),
  } as unknown as InventoryImportUploadService;

  const usersService = {
    findByPhone: jest.fn(),
  } as unknown as UserService;

  const service = new InventoryBulkImportService(uploadService, usersService);

  const templateCsv =
    'sku,name,category,location,unit,quantity\n' +
    'CEMENT_50KG,Cement 50kg Bag,Building Materials,Main Warehouse,bag,100';

  const templateReview = {
    newCategories: ['Building Materials'],
    existingCategories: [],
    newLocations: ['Main Warehouse'],
    existingLocations: [],
    newItems: [{ sku: 'CEMENT_50KG', name: 'Cement 50kg Bag' }],
    existingItems: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (uploadService.parseCsvFile as jest.Mock).mockReturnValue([
      {
        line: 2,
        sku: 'CEMENT_50KG',
        name: 'Cement 50kg Bag',
        category: 'Building Materials',
        location: 'Main Warehouse',
        unit: 'bag',
        quantity: '100.0000',
        reorder_threshold: null,
      },
    ]);
    (uploadService.buildImportReview as jest.Mock).mockResolvedValue(templateReview);
  });

  it('imports valid CSV for owner via auto context without review', async () => {
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

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from(templateCsv, 'utf8'),
      'inventory.csv',
    );

    expect(msg).toContain('✅ Inventory import complete');
    expect(msg).toContain('Added: 2');
    expect(uploadService.uploadCsv).toHaveBeenCalled();
    expect(uploadService.buildImportReview).not.toHaveBeenCalled();
  });

  it('shows review summary after CSV upload in pending session', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from(templateCsv, 'utf8'),
      'inventory.csv',
    );

    expect(msg).toContain('Inventory Import Review');
    expect(msg).toContain('Building Materials');
    expect(msg).toContain('Main Warehouse');
    expect(msg).toContain('CONFIRM');
    expect(uploadService.uploadCsv).not.toHaveBeenCalled();
    expect(service.isAwaitingImportConfirm('+911111111111')).toBe(true);
  });

  it('confirms import and provisions master data', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);
    await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from(templateCsv, 'utf8'),
      'inventory.csv',
    );

    (uploadService.processImportWithProvisioning as jest.Mock).mockResolvedValue({
      addedCount: 1,
      updatedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      rowResults: [],
      categoriesCreatedCount: 1,
      locationsCreatedCount: 1,
    });

    const msg = await service.handleReviewReply('+911111111111', 'CONFIRM');

    expect(msg).toContain('✅ Inventory import complete');
    expect(msg).toContain('Categories Created: 1');
    expect(msg).toContain('Locations Created: 1');
    expect(msg).toContain('Items Created: 1');
    expect(uploadService.processImportWithProvisioning).toHaveBeenCalled();
    expect(service.isAwaitingImportConfirm('+911111111111')).toBe(false);
  });

  it('cancels review without importing', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);
    await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from(templateCsv, 'utf8'),
      'inventory.csv',
    );

    const msg = await service.handleReviewReply('+911111111111', 'CANCEL');

    expect(msg).toContain('Import cancelled');
    expect(uploadService.processImportWithProvisioning).not.toHaveBeenCalled();
    expect(service.isAwaitingImportConfirm('+911111111111')).toBe(false);
  });

  it('rejects invalid extension', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from('data'),
      'inventory.xlsx',
    );

    expect(msg).toBe(WA_INVENTORY_CSV_UNSUPPORTED);
    expect(uploadService.parseCsvFile).not.toHaveBeenCalled();
  });

  it('returns parser error message on parse failure', async () => {
    service.startAwaitingCsv('+911111111111', 1, 42);
    (uploadService.parseCsvFile as jest.Mock).mockImplementation(() => {
      throw new BadRequestException('Galat CSV format');
    });

    const msg = await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from('bad', 'utf8'),
      'inventory.csv',
    );

    expect(msg).toContain('❌ CSV file invalid hai');
    expect(msg).toContain('Galat CSV format');
  });

  it('returns expired message when confirm session is missing', async () => {
    const msg = await service.confirmImport('+911111111111');
    expect(msg).toBe(WA_INVENTORY_IMPORT_REVIEW_EXPIRED);
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
    expect(uploadService.parseCsvFile).not.toHaveBeenCalled();
  });

  it('expires review session after TTL', async () => {
    jest.useFakeTimers();
    service.startAwaitingCsv('+911111111111', 1, 42);
    await service.importFromCsvBuffer(
      '+911111111111',
      Buffer.from(templateCsv, 'utf8'),
      'inventory.csv',
    );

    jest.advanceTimersByTime(INVENTORY_CSV_REVIEW_TTL_MS + 1);

    const msg = await service.confirmImport('+911111111111');
    expect(msg).toContain('expired');
    jest.useRealTimers();
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
