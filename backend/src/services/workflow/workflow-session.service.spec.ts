import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkflowSessionService } from './workflow-session.service';
import { WorkflowSessionRepository } from './workflow-session.repository';
import {
  WORKFLOW_STATUS,
  WORKFLOW_TYPE,
  VENDOR_ONBOARDING_STEP,
} from './workflow.constants';

describe('WorkflowSessionService', () => {
  let service: WorkflowSessionService;
  let model: {
    create: jest.Mock;
    findByPk: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
  };

  const activeRow = {
    id: 1,
    factory_id: 10,
    phone_number: '919999999999',
    workflow_type: WORKFLOW_TYPE.ONBOARD_VENDOR,
    current_step: VENDOR_ONBOARDING_STEP.VENDOR_NAME,
    session_data: {},
    status: WORKFLOW_STATUS.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
    update: jest.fn(),
  };

  beforeEach(() => {
    model = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    const repository = {
      model,
    } as unknown as WorkflowSessionRepository;

    service = new WorkflowSessionService(repository);
    activeRow.update.mockReset();
    activeRow.status = WORKFLOW_STATUS.ACTIVE;
  });

  it('creates a session when none active', async () => {
    model.findOne.mockResolvedValue(null);
    model.create.mockResolvedValue(activeRow);

    const result = await service.createSession({
      factory_id: 10,
      phone_number: '919999999999',
      workflow_type: WORKFLOW_TYPE.ONBOARD_VENDOR,
      current_step: VENDOR_ONBOARDING_STEP.VENDOR_NAME,
    });

    expect(result.id).toBe(1);
    expect(model.create).toHaveBeenCalled();
  });

  it('throws ConflictException when active session exists', async () => {
    model.findOne.mockResolvedValue(activeRow);

    await expect(
      service.createSession({
        factory_id: 10,
        phone_number: '919999999999',
        workflow_type: WORKFLOW_TYPE.ONBOARD_VENDOR,
        current_step: VENDOR_ONBOARDING_STEP.VENDOR_NAME,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('getActiveSession returns active row', async () => {
    model.findOne.mockResolvedValue(activeRow);
    const row = await service.getActiveSession('919999999999');
    expect(row?.status).toBe(WORKFLOW_STATUS.ACTIVE);
  });

  it('updateSession updates step and data', async () => {
    model.findByPk.mockResolvedValue(activeRow);
    activeRow.update.mockResolvedValue(activeRow);

    const result = await service.updateSession(1, {
      current_step: VENDOR_ONBOARDING_STEP.VENDOR_PHONE,
      session_data: { name: 'ABC Steel' },
    });

    expect(activeRow.update).toHaveBeenCalled();
    expect(result.current_step).toBe(VENDOR_ONBOARDING_STEP.VENDOR_NAME);
  });

  it('completeSession marks session completed', async () => {
    model.findByPk.mockResolvedValue(activeRow);
    activeRow.update.mockImplementation(async (patch: any) => {
      activeRow.status = patch.status;
    });

    const result = await service.completeSession(1);
    expect(result.status).toBe(WORKFLOW_STATUS.COMPLETED);
  });

  it('cancelSession marks session cancelled', async () => {
    model.findByPk.mockResolvedValue(activeRow);
    activeRow.update.mockImplementation(async (patch: any) => {
      activeRow.status = patch.status;
    });

    const result = await service.cancelSession(1);
    expect(result.status).toBe(WORKFLOW_STATUS.CANCELLED);
  });

  it('expireSession marks session expired', async () => {
    model.findByPk.mockResolvedValue(activeRow);
    activeRow.update.mockImplementation(async (patch: any) => {
      activeRow.status = patch.status;
    });

    const result = await service.expireSession(1);
    expect(result.status).toBe(WORKFLOW_STATUS.EXPIRED);
  });

  it('getSession throws NotFoundException when missing on update', async () => {
    model.findByPk.mockResolvedValue(null);
    await expect(
      service.updateSession(99, { current_step: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('isExpired returns true when session is older than TTL', () => {
    const old = {
      ...activeRow,
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
    };
    expect(service.isExpired(old)).toBe(true);
  });

  it('isExpired uses updated_at so recent activity keeps session alive', () => {
    const recentActivity = {
      ...activeRow,
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      updated_at: new Date(),
    };
    expect(service.isExpired(recentActivity)).toBe(false);
  });

  it('isExpired returns true when updated_at is stale even if created_at is recent', () => {
    const staleActivity = {
      ...activeRow,
      created_at: new Date(),
      updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
    };
    expect(service.isExpired(staleActivity)).toBe(true);
  });

  it('resolveActiveSession expires stale session', async () => {
    const stale = {
      ...activeRow,
      created_at: new Date(),
      updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      update: jest.fn().mockImplementation(async (patch: any) => {
        stale.status = patch.status;
      }),
    };
    model.findOne.mockResolvedValue(stale);
    model.findByPk.mockResolvedValue(stale);

    const resolved = await service.resolveActiveSession('919999999999');

    expect(resolved.expiredJustNow).toBe(true);
    expect(resolved.session).toBeNull();
  });

  it('expireStaleActiveSessions expires all stale rows', async () => {
    const stale = {
      ...activeRow,
      id: 2,
      created_at: new Date(),
      updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      update: jest.fn().mockImplementation(async (patch: any) => {
        stale.status = patch.status;
      }),
    };
    model.findAll.mockResolvedValue([stale]);
    model.findByPk.mockResolvedValue(stale);

    const count = await service.expireStaleActiveSessions();
    expect(count).toBe(1);
  });
});
