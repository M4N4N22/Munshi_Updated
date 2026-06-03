import { BusinessDiscoveryWorkflowHandler } from './business-discovery.handler';
import {
  BUSINESS_DISCOVERY_STEP,
  WORKFLOW_TYPE,
} from '../workflow.constants';

describe('BusinessDiscoveryWorkflowHandler', () => {
  const discoveryService = {
    pause: jest.fn().mockResolvedValue({}),
    resume: jest.fn().mockResolvedValue({}),
    getProgress: jest.fn().mockResolvedValue({
      readiness: {
        overall: 43,
        identity: 100,
        organization_structure: 50,
        managers: 40,
        workforce: 20,
        inventory: 20,
        vendors: 0,
      },
    }),
    recordBucketField: jest.fn().mockResolvedValue({}),
  };

  let handler: BusinessDiscoveryWorkflowHandler;

  beforeEach(() => {
    handler = new BusinessDiscoveryWorkflowHandler(discoveryService as any);
  });

  it('exposes workflow metadata', () => {
    expect(handler.workflowType).toBe(WORKFLOW_TYPE.BUSINESS_DISCOVERY);
    expect(handler.firstStep).toBe(BUSINESS_DISCOVERY_STEP.MENU);
  });

  it('pauses on pause command', async () => {
    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 3,
        phone_number: '919999999999',
        workflow_type: WORKFLOW_TYPE.BUSINESS_DISCOVERY,
        current_step: BUSINESS_DISCOVERY_STEP.MENU,
        session_data: {},
        status: 'ACTIVE',
      },
      'pause',
      { userId: 1, factoryId: 3, role: 'OWNER', phone: '919999999999' },
    );
    expect(result.completed).toBe(true);
    expect(discoveryService.pause).toHaveBeenCalledWith(3);
  });

  it('blocks operational commands from polluting discovery in COLLECT', async () => {
    const result = await handler.handleStep(
      {
        id: 2,
        factory_id: 3,
        phone_number: '919999999999',
        workflow_type: WORKFLOW_TYPE.BUSINESS_DISCOVERY,
        current_step: BUSINESS_DISCOVERY_STEP.COLLECT,
        session_data: {
          current_bucket: 'BUSINESS_IDENTITY',
          field_index: 0,
        },
        status: 'ACTIVE',
      },
      'inventory status batao',
      { userId: 1, factoryId: 3, role: 'OWNER', phone: '919999999999' },
    );
    expect(discoveryService.recordBucketField).not.toHaveBeenCalled();
    expect(result.message).toContain('operational');
  });

  it('resumes workforce discovery at entity index from session', async () => {
    const result = await handler.handleStep(
      {
        id: 3,
        factory_id: 3,
        phone_number: '919999999999',
        workflow_type: WORKFLOW_TYPE.BUSINESS_DISCOVERY,
        current_step: BUSINESS_DISCOVERY_STEP.COLLECT,
        session_data: {
          current_bucket: 'WORKFORCE_DISCOVERY',
          field_index: 1,
          entity_index: 3,
        },
        status: 'ACTIVE',
      },
      '9199887766',
      { userId: 1, factoryId: 3, role: 'OWNER', phone: '919999999999' },
    );
    expect(discoveryService.recordBucketField).toHaveBeenCalledWith(
      3,
      'WORKFORCE_DISCOVERY',
      'phone',
      '9199887766',
      { entityIndex: 3 },
    );
    expect(result.nextStep).toBe(BUSINESS_DISCOVERY_STEP.COLLECT);
  });
});
