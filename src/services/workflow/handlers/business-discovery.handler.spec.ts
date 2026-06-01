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
      readiness: { overall: 43, identity: 100, organization: 50, inventory: 20, vendors: 0 },
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
});
