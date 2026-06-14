import { Test, TestingModule } from '@nestjs/testing';
import { TaskInventoryCreationWorkflowHandler } from './task-inventory-creation.handler';
import { TaskInventoryConfirmationService } from 'src/services/task-inventory-resolution/task-inventory-confirmation.service';
import { TaskInventoryCreationService } from 'src/services/task-inventory-resolution/task-inventory-creation.service';
import { TASK_INVENTORY_CREATION_STEP } from '../workflow.constants';

describe('TaskInventoryCreationWorkflowHandler', () => {
  let handler: TaskInventoryCreationWorkflowHandler;
  let creationService: jest.Mocked<TaskInventoryCreationService>;

  const context = {
    userId: 10,
    factoryId: 1,
    role: 'OWNER',
    phone: '919900000001',
    userName: 'Owner',
  };

  beforeEach(async () => {
    creationService = {
      createFromSession: jest.fn(),
    } as unknown as jest.Mocked<TaskInventoryCreationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskInventoryCreationWorkflowHandler,
        TaskInventoryConfirmationService,
        { provide: TaskInventoryCreationService, useValue: creationService },
      ],
    }).compile();

    handler = module.get(TaskInventoryCreationWorkflowHandler);
  });

  it('creates task on CONFIRM', async () => {
    creationService.createFromSession.mockResolvedValue({
      taskId: 123,
      message: 'Task created',
    });

    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: context.phone,
        workflow_type: 'TASK_INVENTORY_CREATION',
        current_step: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
        session_data: {
          task_kind: 'delivery',
          quantity: 20,
          worker_user_id: 2,
          worker_name: 'Ram Kumar',
          inventory_item_id: 5,
          inventory_name: 'Cement',
        },
        status: 'ACTIVE',
      },
      'CONFIRM',
      context,
    );

    expect(result.completed).toBe(true);
    expect(creationService.createFromSession).toHaveBeenCalled();
  });

  it('cancels on CANCEL reply', async () => {
    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: context.phone,
        workflow_type: 'TASK_INVENTORY_CREATION',
        current_step: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
        session_data: { task_kind: 'delivery' },
        status: 'ACTIVE',
      },
      'CANCEL',
      context,
    );

    expect(result.cancelled).toBe(true);
    expect(creationService.createFromSession).not.toHaveBeenCalled();
  });

  it('handles inventory selection by number', async () => {
    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: context.phone,
        workflow_type: 'TASK_INVENTORY_CREATION',
        current_step: TASK_INVENTORY_CREATION_STEP.WAITING_INVENTORY_SELECTION,
        session_data: {
          task_kind: 'delivery',
          quantity: 20,
          worker_user_id: 2,
          worker_name: 'Ram Kumar',
          inventory_candidates: [
            { item_id: 5, sku: 'CEM', name: 'Cement 50kg' },
            { item_id: 6, sku: 'PREM', name: 'Cement Premium' },
          ],
        },
        status: 'ACTIVE',
      },
      '1',
      context,
    );

    expect(result.nextStep).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
    );
    expect(result.sessionData?.inventory_item_id).toBe(5);
  });

  it('returns already created on duplicate confirm', async () => {
    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: context.phone,
        workflow_type: 'TASK_INVENTORY_CREATION',
        current_step: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
        session_data: { task_created_id: 99 },
        status: 'ACTIVE',
      },
      'CONFIRM',
      context,
    );

    expect(result.completed).toBe(true);
    expect(creationService.createFromSession).not.toHaveBeenCalled();
  });

  it('advances to worker selection after inventory pick when both ambiguous', async () => {
    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: context.phone,
        workflow_type: 'TASK_INVENTORY_CREATION',
        current_step: TASK_INVENTORY_CREATION_STEP.WAITING_INVENTORY_SELECTION,
        session_data: {
          task_kind: 'delivery',
          quantity: 10,
          inventory_candidates: [
            { item_id: 18, sku: 'CEMENT_50KG', name: 'Cement 50kg' },
            { item_id: 19, sku: 'CEMENT_PREM', name: 'Cement Premium' },
          ],
          worker_candidates: [
            { user_id: 39, name: 'Ram Kumar' },
            { user_id: 40, name: 'Ram Singh' },
          ],
        },
        status: 'ACTIVE',
      },
      '1',
      context,
    );

    expect(result.nextStep).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_WORKER_SELECTION,
    );
    expect(result.sessionData?.inventory_item_id).toBe(18);
    expect(result.sessionData?.worker_candidates).toHaveLength(2);
    expect(creationService.createFromSession).not.toHaveBeenCalled();
  });

  it('handles worker-only selection then confirmation', async () => {
    const workerPick = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: context.phone,
        workflow_type: 'TASK_INVENTORY_CREATION',
        current_step: TASK_INVENTORY_CREATION_STEP.WAITING_WORKER_SELECTION,
        session_data: {
          task_kind: 'delivery',
          quantity: 20,
          inventory_item_id: 18,
          inventory_name: 'Cement 50kg',
          worker_candidates: [
            { user_id: 39, name: 'Ram Kumar' },
            { user_id: 40, name: 'Ram Singh' },
          ],
        },
        status: 'ACTIVE',
      },
      '2',
      context,
    );

    expect(workerPick.nextStep).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
    );
    expect(workerPick.sessionData?.worker_user_id).toBe(40);
  });

  it('asks for quantity then shows confirmation', async () => {
    const qtyStep = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: context.phone,
        workflow_type: 'TASK_INVENTORY_CREATION',
        current_step: TASK_INVENTORY_CREATION_STEP.WAITING_QUANTITY,
        session_data: {
          task_kind: 'delivery',
          worker_user_id: 39,
          worker_name: 'Vikram Shah',
          inventory_item_id: 18,
          inventory_name: 'Test item 1',
        },
        status: 'ACTIVE',
      },
      '5',
      context,
    );

    expect(qtyStep.nextStep).toBe(
      TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
    );
    expect(qtyStep.sessionData?.quantity).toBe(5);
    expect(qtyStep.message).toContain('Confirm task');
  });

  it('creates delivery task on confirmation synonyms', async () => {
    creationService.createFromSession.mockResolvedValue({
      taskId: 200,
      message: 'Delivery task created',
    });

    for (const reply of ['CONFIRM', 'YES', '1', 'haan', 'ok', 'theek hai']) {
      creationService.createFromSession.mockClear();
      const result = await handler.handleStep(
        {
          id: 1,
          factory_id: 1,
          phone_number: context.phone,
          workflow_type: 'TASK_INVENTORY_CREATION',
          current_step: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
          session_data: {
            task_kind: 'delivery',
            quantity: 20,
            worker_user_id: 39,
            worker_name: 'Ram Kumar',
            inventory_item_id: 18,
            inventory_name: 'Cement 50kg',
          },
          status: 'ACTIVE',
        },
        reply,
        context,
      );

      expect(result.completed).toBe(true);
      expect(creationService.createFromSession).toHaveBeenCalledTimes(1);
    }
  });

  it('creates exactly one task when confirm is sent twice', async () => {
    creationService.createFromSession.mockResolvedValue({
      taskId: 201,
      message: 'Delivery task created',
    });

    const session = {
      id: 1,
      factory_id: 1,
      phone_number: context.phone,
      workflow_type: 'TASK_INVENTORY_CREATION' as const,
      current_step: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
      session_data: {
        task_kind: 'delivery',
        quantity: 20,
        worker_user_id: 39,
        worker_name: 'Ram Kumar',
        inventory_item_id: 18,
        inventory_name: 'Cement 50kg',
      },
      status: 'ACTIVE' as const,
    };

    const first = await handler.handleStep(session, 'CONFIRM', context);
    expect(first.completed).toBe(true);
    expect(creationService.createFromSession).toHaveBeenCalledTimes(1);

    const second = await handler.handleStep(
      {
        ...session,
        session_data: {
          ...session.session_data,
          task_created_id: 201,
        },
      },
      'CONFIRM',
      context,
    );

    expect(second.completed).toBe(true);
    expect(creationService.createFromSession).toHaveBeenCalledTimes(1);
  });
});
