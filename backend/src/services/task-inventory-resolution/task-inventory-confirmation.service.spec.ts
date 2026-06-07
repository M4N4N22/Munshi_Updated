import { Test, TestingModule } from '@nestjs/testing';
import { TaskInventoryConfirmationService } from './task-inventory-confirmation.service';

describe('TaskInventoryConfirmationService', () => {
  let service: TaskInventoryConfirmationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskInventoryConfirmationService],
    }).compile();
    service = module.get(TaskInventoryConfirmationService);
  });

  it('builds confirmation message with worker inventory and quantity', () => {
    const text = service.buildConfirmationMessage({
      task_kind: 'delivery',
      quantity: 20,
      inventory: {
        status: 'resolved',
        item_id: 1,
        sku: 'CEMENT_50KG',
        name: 'Cement 50kg',
      },
      worker: {
        status: 'resolved',
        user_id: 2,
        name: 'Ram Kumar',
      },
      disambiguation: [],
    });

    expect(text).toContain('Ram Kumar');
    expect(text).toContain('Cement 50kg');
    expect(text).toContain('20');
    expect(text).toContain('CONFIRM');
  });

  it('builds inventory disambiguation list', () => {
    const text = service.buildInventoryDisambiguationPrompt([
      { item_id: 1, sku: 'A', name: 'Cement 50kg', match_type: 'partial' },
      { item_id: 2, sku: 'B', name: 'Cement Premium', match_type: 'partial' },
    ]);
    expect(text).toContain('1. Cement 50kg');
    expect(text).toContain('2. Cement Premium');
  });
});
