import { Test, TestingModule } from '@nestjs/testing';
import { TaskInventoryCreationService } from './task-inventory-creation.service';
import { TaskInventoryConfirmationService } from './task-inventory-confirmation.service';
import { TasksService } from 'src/services/tasks/tasks.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { FactoryService } from 'src/services/factories/factories.service';
import { TASK_INVENTORY_MOVEMENT_TYPE } from 'src/services/tasks/tasks.inventory.constants';

describe('TaskInventoryCreationService', () => {
  let service: TaskInventoryCreationService;
  let tasksService: jest.Mocked<TasksService>;

  beforeEach(async () => {
    tasksService = {
      assignToUser: jest.fn().mockResolvedValue({ id: 500 }),
    } as unknown as jest.Mocked<TasksService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskInventoryCreationService,
        TaskInventoryConfirmationService,
        { provide: TasksService, useValue: tasksService },
        {
          provide: InventoryService,
          useValue: {
            findItem: jest.fn().mockResolvedValue({
              id: 18,
              name: 'Cement 50kg',
              sku: 'CEMENT_50KG',
              unit: 'bag',
            }),
          },
        },
        {
          provide: FactoryService,
          useValue: {
            getFactoryUsers: jest.fn().mockResolvedValue([{ user_id: 39 }]),
          },
        },
      ],
    }).compile();

    service = module.get(TaskInventoryCreationService);
  });

  it('creates delivery task with STOCK_OUT inventory line', async () => {
    const result = await service.createFromSession(
      {
        task_kind: 'delivery',
        quantity: 20,
        worker_user_id: 39,
        worker_name: 'Ram Kumar',
        inventory_item_id: 18,
        inventory_name: 'Cement 50kg',
        raw_message: 'Ram ko 20 cement deliver kar do',
      },
      37,
      5,
    );

    expect(result.taskId).toBe(500);
    expect(tasksService.assignToUser).toHaveBeenCalledWith(
      39,
      37,
      5,
      expect.stringContaining('[DELIVERY]'),
      {
        inventory_lines: [
          {
            inventory_item_id: 18,
            quantity_expected: '20.0000',
            movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
          },
        ],
      },
    );
  });
});
