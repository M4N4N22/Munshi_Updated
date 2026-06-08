import { BadRequestException } from '@nestjs/common';
import { InventoryImportUploadService } from './inventory-import-upload.service';
import type { InventoryImportService } from './inventory-import.service';

describe('InventoryImportUploadService', () => {
  const importService = {
    processImport: jest.fn(),
    buildImportReview: jest.fn(),
    ensureMasterData: jest.fn(),
  } as unknown as InventoryImportService;

  const service = new InventoryImportUploadService(importService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing file', async () => {
    await expect(
      service.uploadCsv(undefined, {
        factory_id: 1,
        created_by: 2,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects xlsx extension', async () => {
    await expect(
      service.uploadCsv(
        {
          originalname: 'items.xlsx',
          buffer: Buffer.from('a,b,c'),
        },
        { factory_id: 1, created_by: 2 },
      ),
    ).rejects.toThrow(/not allowed|Sirf .csv/i);
  });

  it('rejects parser errors as BadRequestException', async () => {
    const csv = 'wrong,headers\na,b';

    await expect(
      service.uploadCsv(
        {
          originalname: 'items.csv',
          buffer: Buffer.from(csv, 'utf8'),
        },
        { factory_id: 1, created_by: 2 },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(importService.processImport).not.toHaveBeenCalled();
  });

  it('delegates valid CSV to processImport', async () => {
    (importService.processImport as jest.Mock).mockResolvedValue({
      addedCount: 1,
      updatedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      rowResults: [],
    });

    const csv =
      'sku,name,category,location,unit,quantity\n' +
      'SKU1,Item,Cat,Loc,pcs,1';

    const summary = await service.uploadCsv(
      {
        originalname: 'items.csv',
        buffer: Buffer.from(csv, 'utf8'),
      },
      { factory_id: 1, created_by: 2, batch_id: 99 },
    );

    expect(summary.addedCount).toBe(1);
    expect(importService.processImport).toHaveBeenCalledWith(
      1,
      2,
      expect.any(Array),
      99,
    );
  });
});
