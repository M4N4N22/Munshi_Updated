import { BadRequestException } from '@nestjs/common';
import { WorkerOnboardingWorkflowHandler } from './worker-onboarding.handler';
import { WorkerOnboardingService } from '../worker-onboarding.service';
import { DepartmentsService } from 'src/services/departments/departments.service';
import {
  WORKER_ONBOARDING_STEP,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  IWorkflowSessionRecord,
  WorkflowUserContext,
} from '../workflow.interfaces';

describe('WorkerOnboardingWorkflowHandler', () => {
  let handler: WorkerOnboardingWorkflowHandler;
  let workerOnboardingService: jest.Mocked<WorkerOnboardingService>;
  let departmentsService: jest.Mocked<DepartmentsService>;

  const context: WorkflowUserContext = {
    userId: 1,
    factoryId: 10,
    role: 'OWNER',
    phone: '919999999999',
  };

  const departments = [
    { id: 3, name: 'Sales', slug: 'sales' },
    { id: 4, name: 'IT', slug: 'it' },
  ];

  const baseSession = (
    step: string,
    data: Record<string, unknown> = {},
  ): IWorkflowSessionRecord => ({
    id: 1,
    factory_id: 10,
    phone_number: '919999999999',
    workflow_type: WORKFLOW_TYPE.ONBOARD_WORKER,
    current_step: step,
    session_data: data,
    status: 'ACTIVE',
  });

  beforeEach(() => {
    workerOnboardingService = {
      onboardWorker: jest.fn(),
    } as unknown as jest.Mocked<WorkerOnboardingService>;

    departmentsService = {
      listByFactory: jest.fn().mockResolvedValue(departments),
    } as unknown as jest.Mocked<DepartmentsService>;

    handler = new WorkerOnboardingWorkflowHandler(
      workerOnboardingService,
      departmentsService,
    );
  });

  it('returns initial worker name prompt', () => {
    expect(handler.getInitialPrompt()).toContain('worker name');
  });

  it('happy path — creates worker with department and skip DOJ', async () => {
    workerOnboardingService.onboardWorker.mockResolvedValue({
      userId: 77,
      factoryUserId: 12,
      departmentId: 3,
    });

    const nameResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_NAME),
      'Anil Kumar',
      context,
    );
    expect(nameResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_PHONE);

    const phoneResult = await handler.handleStep(
      baseSession(
        WORKER_ONBOARDING_STEP.WORKER_PHONE,
        nameResult.sessionData!,
      ),
      '9876543210',
      context,
    );
    expect(phoneResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT);

    const deptResult = await handler.handleStep(
      baseSession(
        WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT,
        phoneResult.sessionData!,
      ),
      'Sales',
      context,
    );
    expect(deptResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_DOJ);

    const finalResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_DOJ, deptResult.sessionData!),
      'SKIP',
      context,
    );

    expect(finalResult.completed).toBe(true);
    expect(workerOnboardingService.onboardWorker).toHaveBeenCalledWith({
      factoryId: 10,
      name: 'Anil Kumar',
      phoneNumber: '9876543210',
      departmentId: 3,
      doj: null,
    });
  });

  it('rejects invalid department', async () => {
    const phoneResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT, {
        name: 'Anil Kumar',
        phone_number: '9876543210',
      }),
      'Unknown Dept',
      context,
    );

    expect(phoneResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT);
    expect(phoneResult.message).toContain('Invalid input');
  });

  it('rewinds to phone on duplicate phone error', async () => {
    workerOnboardingService.onboardWorker.mockRejectedValue(
      new BadRequestException('A user with this phone already exists'),
    );

    const result = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_DOJ, {
        name: 'Anil Kumar',
        phone_number: '9876543210',
        department_id: 3,
      }),
      'SKIP',
      context,
    );

    expect(result.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_PHONE);
    expect(result.message).toContain('phone');
  });
});
