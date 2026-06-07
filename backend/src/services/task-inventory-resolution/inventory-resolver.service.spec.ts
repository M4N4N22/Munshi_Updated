import { Test, TestingModule } from '@nestjs/testing';
import { InventoryRepository } from 'src/services/inventory/inventory.repository';
import { InventoryResolverService } from './inventory-resolver.service';

describe('InventoryResolverService', () => {
  let service: InventoryResolverService;
  let repository: jest.Mocked<InventoryRepository>;

  const cement = { id: 10, sku: 'CEMENT_50KG', name: 'Cement' };
  const premium = { id: 11, sku: 'CEMENT_PREM', name: 'Cement Premium' };
  const white = { id: 12, sku: 'WHITE_CEM', name: 'White Cement' };

  beforeEach(async () => {
    repository = {
      findItemBySku: jest.fn().mockResolvedValue(null),
      findItemBySkuIgnoreCase: jest.fn().mockResolvedValue(null),
      findItemByName: jest.fn().mockResolvedValue(null),
      findActiveItemSummaries: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<InventoryRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryResolverService,
        { provide: InventoryRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(InventoryResolverService);
  });

  it('resolves exact SKU', async () => {
    repository.findItemBySku.mockResolvedValue(cement as any);
    const result = await service.resolve(1, 'CEMENT_50KG');
    expect(result).toEqual({
      status: 'resolved',
      item_id: 10,
      sku: 'CEMENT_50KG',
      name: 'Cement',
      match_type: 'exact_sku',
    });
  });

  it('resolves exact name', async () => {
    repository.findItemByName.mockResolvedValue(cement as any);
    const result = await service.resolve(1, 'cement');
    expect(result.status).toBe('resolved');
    expect(result.match_type).toBe('exact_name');
    expect(result.item_id).toBe(10);
  });

  it('resolves case-insensitive SKU', async () => {
    repository.findItemBySkuIgnoreCase.mockResolvedValue(cement as any);
    const result = await service.resolve(1, 'cement_50kg');
    expect(result.status).toBe('resolved');
    expect(result.match_type).toBe('case_insensitive');
  });

  it('resolves fuzzy name match', async () => {
    repository.findActiveItemSummaries.mockResolvedValue([cement] as any);
    const result = await service.resolve(1, 'cemnt');
    expect(result.status).toBe('resolved');
    expect(result.match_type).toBe('fuzzy');
    expect(result.item_id).toBe(10);
  });

  it('returns ambiguous for multiple partial matches', async () => {
    repository.findActiveItemSummaries.mockResolvedValue([
      cement,
      premium,
      white,
    ] as any);
    const result = await service.resolve(1, 'cement');
    expect(result.status).toBe('ambiguous');
    expect(result.candidates?.length).toBeGreaterThan(1);
  });

  it('returns not_found when hint missing', async () => {
    expect(await service.resolve(1, null)).toEqual({ status: 'not_found' });
  });

  it('returns not_found when no items match', async () => {
    repository.findActiveItemSummaries.mockResolvedValue([cement] as any);
    const result = await service.resolve(1, 'steel');
    expect(result.status).toBe('not_found');
  });
});
