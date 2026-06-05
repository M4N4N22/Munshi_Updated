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
import { USER_ROLE } from 'src/services/users/users.constants';
import { UserService } from 'src/services/users/users.service';

describe('WorkerOnboardingWorkflowHandler', () => {
  let handler: WorkerOnboardingWorkflowHandler;
  let workerOnboardingService: jest.Mocked<WorkerOnboardingService>;
  let departmentsService: jest.Mocked<DepartmentsService>;
  let usersService: jest.Mocked<UserService>;

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
      findOrCreateByName: jest.fn().mockResolvedValue({
        id: 9,
        name: 'Production',
        slug: 'production',
      }),
      findDepartmentHeadedByUser: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<DepartmentsService>;

    usersService = {
      findByPhone: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserService>;

    handler = new WorkerOnboardingWorkflowHandler(
      workerOnboardingService,
      departmentsService,
      usersService,
    );
  });

  it('returns initial worker name prompt in Hindi', () => {
    expect(handler.getInitialPrompt()).toContain('naam');
  });

  it('builds resume reminder for interrupted flow', async () => {
    const reminder = await handler.buildResumeReminder(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_ROLE, {
        name: 'Mayank Pawar',
        phone_number: '9876543210',
        department_id: 3,
      }),
      context,
    );
    expect(reminder).toContain('adhura');
    expect(reminder).toContain('Mayank Pawar');
    expect(reminder).toContain('Worker ya Manager');
  });

  it('happy path — worker with department, role, skip DOJ', async () => {
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
    expect(phoneResult.message).toContain('Sales');
    expect(phoneResult.message).toContain('Number save');

    const deptResult = await handler.handleStep(
      baseSession(
        WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT,
        phoneResult.sessionData!,
      ),
      'Sales',
      context,
    );
    expect(deptResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_ROLE);
    expect(deptResult.message).toContain('Role');
    expect(deptResult.message).toContain('Manager');
    expect(deptResult.message).toContain('Worker');

    const roleResult = await handler.handleStep(
      baseSession(
        WORKER_ONBOARDING_STEP.WORKER_ROLE,
        deptResult.sessionData!,
      ),
      'Manager',
      context,
    );
    expect(roleResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_DOJ);

    const finalResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_DOJ, roleResult.sessionData!),
      'SKIP',
      context,
    );

    expect(finalResult.completed).toBe(true);
    expect(workerOnboardingService.onboardWorker).toHaveBeenCalledWith({
      factoryId: 10,
      name: 'Anil Kumar',
      phoneNumber: '9876543210',
      departmentId: 3,
      role: USER_ROLE.MANAGER,
      doj: null,
    });
  });

  it('treats contact share as phone step when DB step is ahead (stale role step)', async () => {
    const phoneResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_ROLE, {
        name: 'Mayank Pawar',
        department_id: 99,
      }),
      '__MUNSHI_CONTACT_NO_PHONE__:Mayank',
      context,
    );

    expect(phoneResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_PHONE);
    expect(phoneResult.message).toContain('number nahi mila');
    expect(phoneResult.message).not.toContain('Role samajh');
  });

  it('accepts typed phone when DB step is still role', async () => {
    const phoneResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_ROLE, {
        name: 'Mayank Pawar',
      }),
      '7247577182',
      context,
    );

    expect(phoneResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT);
    expect(phoneResult.sessionData).toMatchObject({
      phone_number: '7247577182',
    });
  });

  it('nudges when contact share has no phone in webhook', async () => {
    const phoneResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_PHONE, {
        name: 'Mayank',
      }),
      '__MUNSHI_CONTACT_NO_PHONE__:Mayank',
      context,
    );

    expect(phoneResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_PHONE);
    expect(phoneResult.message).toContain('number nahi mila');
  });

  it('rejects name when phone step expects digits', async () => {
    const phoneResult = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_PHONE, {
        name: 'Mayank',
      }),
      'Mayank',
      context,
    );

    expect(phoneResult.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_PHONE);
    expect(phoneResult.message).toContain('Number');
  });

  it('owner can auto-create new team while already heading General', async () => {
    departmentsService.listByFactory.mockResolvedValue([
      { id: 1, name: 'General', slug: 'general' },
    ] as any);
    departmentsService.findOrCreateByName.mockResolvedValue({
      id: 5,
      name: 'Sales',
      slug: 'sales',
    } as any);

    const result = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT, {
        name: 'Mayank Pawar',
        phone_number: '7247577182',
      }),
      'Sales',
      context,
    );

    expect(departmentsService.findOrCreateByName).toHaveBeenCalledWith(
      10,
      'Sales',
      1,
    );
    expect(result.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_ROLE);
    expect(result.sessionData).toMatchObject({ department_id: 5 });
  });

  it('creates department when factory has none', async () => {
    departmentsService.listByFactory.mockResolvedValue([]);
    departmentsService.findOrCreateByName.mockResolvedValue({
      id: 11,
      name: 'production',
      slug: 'production',
    } as any);
    workerOnboardingService.onboardWorker.mockResolvedValue({
      userId: 80,
      factoryUserId: 13,
      departmentId: 11,
    });

    const afterPhone = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT, {
        name: 'Mayank',
        phone_number: '7247577182',
      }),
      'production',
      context,
    );

    expect(departmentsService.findOrCreateByName).toHaveBeenCalledWith(
      10,
      'production',
      1,
    );
    expect(afterPhone.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_ROLE);

    const afterRole = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_ROLE, afterPhone.sessionData!),
      'MANAGER',
      context,
    );

    const done = await handler.handleStep(
      baseSession(WORKER_ONBOARDING_STEP.WORKER_DOJ, afterRole.sessionData!),
      'skip',
      context,
    );

    expect(done.completed).toBe(true);
    expect(workerOnboardingService.onboardWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 11,
        role: USER_ROLE.MANAGER,
      }),
    );
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
        worker_role: USER_ROLE.WORKER,
      }),
      'SKIP',
      context,
    );

    expect(result.nextStep).toBe(WORKER_ONBOARDING_STEP.WORKER_PHONE);
    expect(result.message).toContain('Number');
  });
});
