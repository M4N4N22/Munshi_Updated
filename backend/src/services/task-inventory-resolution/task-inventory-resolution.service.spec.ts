import { Test, TestingModule } from '@nestjs/testing';
import { InventoryResolverService } from './inventory-resolver.service';
import { TaskInventoryResolutionService } from './task-inventory-resolution.service';
import { WorkerResolverService } from './worker-resolver.service';

describe('TaskInventoryResolutionService', () => {
  let service: TaskInventoryResolutionService;
  let inventoryResolver: jest.Mocked<InventoryResolverService>;
  let workerResolver: jest.Mocked<WorkerResolverService>;

  beforeEach(async () => {
    inventoryResolver = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<InventoryResolverService>;
    workerResolver = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<WorkerResolverService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskInventoryResolutionService,
        { provide: InventoryResolverService, useValue: inventoryResolver },
        { provide: WorkerResolverService, useValue: workerResolver },
      ],
    }).compile();

    service = module.get(TaskInventoryResolutionService);
  });

  it('returns fully resolved intent', async () => {
    inventoryResolver.resolve.mockResolvedValue({
      status: 'resolved',
      item_id: 123,
      sku: 'CEMENT_50KG',
      name: 'Cement',
      match_type: 'exact_sku',
    });
    workerResolver.resolve.mockResolvedValue({
      status: 'resolved',
      user_id: 456,
      name: 'Ram Kumar',
      match_type: 'exact',
    });

    const result = await service.resolveIntent(1, {
      item_name_or_sku: 'cement',
      quantity: 20,
      assignee_hint: 'Ram',
      task_kind: 'delivery',
    });

    expect(result.task_kind).toBe('delivery');
    expect(result.quantity).toBe(20);
    expect(result.inventory.status).toBe('resolved');
    expect(result.worker.status).toBe('resolved');
    expect(result.disambiguation).toEqual([]);
  });

  it('returns inventory disambiguation when inventory ambiguous', async () => {
    inventoryResolver.resolve.mockResolvedValue({
      status: 'ambiguous',
      candidates: [
        { item_id: 1, sku: 'A', name: 'Cement 50kg', match_type: 'partial' },
        { item_id: 2, sku: 'B', name: 'Cement Premium', match_type: 'partial' },
      ],
    });
    workerResolver.resolve.mockResolvedValue({
      status: 'resolved',
      user_id: 456,
      name: 'Ram Kumar',
      match_type: 'exact',
    });

    const result = await service.resolveIntent(1, {
      item_name_or_sku: 'cement',
      quantity: 20,
      assignee_hint: 'Ram',
      task_kind: 'delivery',
    });

    expect(result.disambiguation).toEqual([
      {
        type: 'inventory_disambiguation',
        candidates: ['Cement 50kg', 'Cement Premium'],
      },
    ]);
  });

  it('returns worker disambiguation when worker ambiguous', async () => {
    inventoryResolver.resolve.mockResolvedValue({
      status: 'resolved',
      item_id: 123,
      sku: 'CEMENT_50KG',
      name: 'Cement',
      match_type: 'exact_sku',
    });
    workerResolver.resolve.mockResolvedValue({
      status: 'ambiguous',
      candidates: [
        { user_id: 1, name: 'Ram Kumar', match_type: 'partial' },
        { user_id: 2, name: 'Ram Singh', match_type: 'partial' },
      ],
    });

    const result = await service.resolveIntent(1, {
      item_name_or_sku: 'CEMENT_50KG',
      quantity: 5,
      assignee_hint: 'Ram',
      task_kind: 'issue',
    });

    expect(result.disambiguation[0]).toEqual({
      type: 'worker_disambiguation',
      candidates: ['Ram Kumar', 'Ram Singh'],
    });
  });

  it('returns both unresolved without disambiguation payloads when not_found', async () => {
    inventoryResolver.resolve.mockResolvedValue({ status: 'not_found' });
    workerResolver.resolve.mockResolvedValue({ status: 'not_found' });

    const result = await service.resolveIntent(1, {
      item_name_or_sku: null,
      quantity: null,
      assignee_hint: null,
      task_kind: 'inventory_count',
    });

    expect(result.inventory.status).toBe('not_found');
    expect(result.worker.status).toBe('not_found');
    expect(result.disambiguation).toEqual([]);
  });

  it('defaults quantity to 1 when delivery has resolved worker and inventory', async () => {
    inventoryResolver.resolve.mockResolvedValue({
      status: 'resolved',
      item_id: 123,
      sku: 'TEST_ITEM_01',
      name: 'Test item 1',
      match_type: 'exact_sku',
    });
    workerResolver.resolve.mockResolvedValue({
      status: 'resolved',
      user_id: 456,
      name: 'Vikram Shah',
      match_type: 'partial',
    });

    const result = await service.resolveIntent(1, {
      item_name_or_sku: 'TEST_ITEM_01',
      quantity: null,
      assignee_hint: 'Vikram',
      task_kind: 'delivery',
    });

    expect(result.quantity).toBe(1);
  });
});
