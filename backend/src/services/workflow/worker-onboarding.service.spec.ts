import { BadRequestException } from '@nestjs/common';
import { WorkerOnboardingService } from './worker-onboarding.service';
import { FactoryService } from 'src/services/factories/factories.service';
import { DepartmentsService } from 'src/services/departments/departments.service';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { USER_ROLE } from 'src/services/users/users.constants';

describe('WorkerOnboardingService', () => {
  let service: WorkerOnboardingService;
  let factoryService: jest.Mocked<FactoryService>;
  let departmentsService: jest.Mocked<DepartmentsService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(() => {
    factoryService = {
      assignMember: jest.fn(),
      updateFactoryUser: jest.fn(),
    } as unknown as jest.Mocked<FactoryService>;

    departmentsService = {
      listByFactory: jest.fn().mockResolvedValue([
        { id: 3, name: 'Sales', slug: 'sales' },
      ]),
      addWorker: jest.fn(),
    } as unknown as jest.Mocked<DepartmentsService>;

    messagingService = {
      buildWorkerWelcomeText: jest
        .fn()
        .mockReturnValue('Welcome to Munshi'),
      sendText: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessagingService>;

    service = new WorkerOnboardingService(
      factoryService,
      departmentsService,
      messagingService,
    );
  });

  it('creates user, factory link, and department worker', async () => {
    factoryService.assignMember.mockResolvedValue({
      id: 10,
      user_id: 55,
      factory_id: 1,
      role: USER_ROLE.WORKER,
    } as any);

    const result = await service.onboardWorker({
      factoryId: 1,
      name: 'Anil Kumar',
      phoneNumber: '9876543210',
      departmentId: 3,
      doj: new Date('2026-05-29T00:00:00.000Z'),
    });

    expect(factoryService.assignMember).toHaveBeenCalledWith({
      factory_id: '1',
      phone_number: '9876543210',
      name: 'Anil Kumar',
      role: USER_ROLE.WORKER,
    });
    expect(factoryService.updateFactoryUser).toHaveBeenCalledWith(10, {
      doj: '2026-05-29',
    });
    expect(departmentsService.addWorker).toHaveBeenCalledWith(3, {
      user_id: 55,
    });
    expect(messagingService.sendText).toHaveBeenCalledWith(
      '9876543210',
      'Welcome to Munshi',
    );
    expect(result.userId).toBe(55);
  });

  it('rejects department outside factory', async () => {
    await expect(
      service.onboardWorker({
        factoryId: 1,
        name: 'Anil Kumar',
        phoneNumber: '9876543210',
        departmentId: 99,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
