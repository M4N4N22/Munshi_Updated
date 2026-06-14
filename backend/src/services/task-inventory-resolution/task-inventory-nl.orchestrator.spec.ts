import { Test, TestingModule } from '@nestjs/testing';
import { TaskInventoryNlOrchestratorService } from './task-inventory-nl.orchestrator';
import { MlTaskInventoryClient } from './ml-task-inventory.client';
import { TaskInventoryResolutionService } from './task-inventory-resolution.service';
import { TaskInventoryConfirmationService } from './task-inventory-confirmation.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowRegistry } from '../workflow/workflow.registry';
import { UserService } from 'src/services/users/users.service';
import { TASK_INVENTORY_CREATION_STEP } from '../workflow/workflow.constants';

describe('TaskInventoryNlOrchestratorService', () => {
  let service: TaskInventoryNlOrchestratorService;
  let mlClient: jest.Mocked<MlTaskInventoryClient>;

  beforeEach(async () => {
    mlClient = { extract: jest.fn() } as unknown as jest.Mocked<MlTaskInventoryClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskInventoryNlOrchestratorService,
        TaskInventoryConfirmationService,
        { provide: MlTaskInventoryClient, useValue: mlClient },
        {
          provide: TaskInventoryResolutionService,
          useValue: {
            resolveIntent: jest.fn().mockResolvedValue({
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
            }),
          },
        },
        {
          provide: WorkflowEngineService,
          useValue: {
            startWorkflowWithSessionData: jest
              .fn()
              .mockResolvedValue('confirm prompt'),
          },
        },
        {
          provide: WorkflowRegistry,
          useValue: { getHandlerByType: jest.fn().mockReturnValue({}) },
        },
        {
          provide: UserService,
          useValue: {
            findByPhone: jest.fn().mockResolvedValue({
              id: 10,
              name: 'Owner',
              factory_links: { factory_id: 1, role: 'OWNER' },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(TaskInventoryNlOrchestratorService);
  });

  it('returns null when ML extraction has no task_kind', async () => {
    mlClient.extract.mockResolvedValue({
      item_name_or_sku: null,
      quantity: null,
      assignee_hint: null,
      task_kind: null,
    });

    expect(await service.tryHandleFreeText('919900000001', 'hello')).toBeNull();
  });

  it('starts workflow for delivery NL message', async () => {
    mlClient.extract.mockResolvedValue({
      item_name_or_sku: 'cement',
      quantity: 20,
      assignee_hint: 'Ram',
      task_kind: 'delivery',
    });

    const result = await service.tryHandleFreeText(
      '919900000001',
      'Ram ko 20 cement bags deliver kar do',
    );

    expect(result).toBe('confirm prompt');
  });

  it('builds inventory disambiguation bootstrap', () => {
    const bootstrap = service.buildBootstrap(
      {
        task_kind: 'delivery',
        quantity: 20,
        inventory: {
          status: 'ambiguous',
          candidates: [
            { item_id: 1, sku: 'A', name: 'Cement 50kg', match_type: 'partial' },
          ],
        },
        worker: {
          status: 'resolved',
          user_id: 2,
          name: 'Ram Kumar',
        },
        disambiguation: [],
      },
      'raw message',
      {
        userId: 10,
        factoryId: 1,
        role: 'OWNER',
        phone: '919900000001',
      },
    );

    expect(bootstrap.step).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_INVENTORY_SELECTION,
    );
    expect(bootstrap.sessionData.worker_user_id).toBe(2);
    expect(bootstrap.sessionData.worker_name).toBe('Ram Kumar');
  });

  it('preserves worker candidates when inventory and worker are both ambiguous', () => {
    const bootstrap = service.buildBootstrap(
      {
        task_kind: 'delivery',
        quantity: 10,
        inventory: {
          status: 'ambiguous',
          candidates: [
            { item_id: 18, sku: 'CEMENT_50KG', name: 'Cement 50kg', match_type: 'partial' },
            { item_id: 19, sku: 'CEMENT_PREM', name: 'Cement Premium', match_type: 'partial' },
          ],
        },
        worker: {
          status: 'ambiguous',
          candidates: [
            { user_id: 39, name: 'Ram Kumar', match_type: 'partial' },
            { user_id: 40, name: 'Ram Singh', match_type: 'partial' },
          ],
        },
        disambiguation: [],
      },
      'Ram ko 10 cement deliver kar do',
      {
        userId: 37,
        factoryId: 5,
        role: 'OWNER',
        phone: '919900000001',
      },
    );

    expect(bootstrap.step).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_INVENTORY_SELECTION,
    );
    expect(bootstrap.sessionData.inventory_candidates).toHaveLength(2);
    expect(bootstrap.sessionData.worker_candidates).toHaveLength(2);
  });

  it('builds worker-only disambiguation bootstrap', () => {
    const bootstrap = service.buildBootstrap(
      {
        task_kind: 'delivery',
        quantity: 20,
        inventory: {
          status: 'resolved',
          item_id: 18,
          sku: 'CEMENT_50KG',
          name: 'Cement 50kg',
        },
        worker: {
          status: 'ambiguous',
          candidates: [
            { user_id: 39, name: 'Ram Kumar', match_type: 'partial' },
            { user_id: 40, name: 'Ram Singh', match_type: 'partial' },
          ],
        },
        disambiguation: [],
      },
      'Ram ko 20 cement deliver kar do',
      {
        userId: 37,
        factoryId: 5,
        role: 'OWNER',
        phone: '919900000001',
      },
    );

    expect(bootstrap.step).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_WORKER_SELECTION,
    );
    expect(bootstrap.sessionData.inventory_item_id).toBe(18);
    expect(bootstrap.sessionData.worker_candidates).toHaveLength(2);
  });

  it('builds quantity prompt when worker and inventory resolve without quantity', () => {
    const bootstrap = service.buildBootstrap(
      {
        task_kind: 'delivery',
        quantity: null,
        inventory: {
          status: 'resolved',
          item_id: 18,
          sku: 'TEST_ITEM_01',
          name: 'Test item 1',
        },
        worker: {
          status: 'resolved',
          user_id: 39,
          name: 'Vikram Shah',
        },
        disambiguation: [],
      },
      'vikram test item 1 bhejo',
      {
        userId: 37,
        factoryId: 5,
        role: 'OWNER',
        phone: '919900000001',
      },
    );

    expect(bootstrap.step).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_QUANTITY,
    );
    expect(bootstrap.prompt).toContain('Quantity');
  });
});
