import { ConflictException } from '@nestjs/common';
import { VendorOnboardingWorkflowHandler } from './vendor-onboarding.handler';
import { VendorService } from 'src/services/vendors/vendors.service';
import {
  VENDOR_ONBOARDING_STEP,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  IWorkflowSessionRecord,
  WorkflowUserContext,
} from '../workflow.interfaces';

describe('VendorOnboardingWorkflowHandler', () => {
  let handler: VendorOnboardingWorkflowHandler;
  let vendorService: jest.Mocked<VendorService>;

  const context: WorkflowUserContext = {
    userId: 1,
    factoryId: 10,
    role: 'OWNER',
    phone: '919999999999',
  };

  const baseSession = (
    step: string,
    data: Record<string, unknown> = {},
  ): IWorkflowSessionRecord => ({
    id: 1,
    factory_id: 10,
    phone_number: '919999999999',
    workflow_type: WORKFLOW_TYPE.ONBOARD_VENDOR,
    current_step: step,
    session_data: data,
    status: 'ACTIVE',
  });

  beforeEach(() => {
    vendorService = {
      createVendor: jest.fn(),
    } as unknown as jest.Mocked<VendorService>;

    handler = new VendorOnboardingWorkflowHandler(vendorService);
  });

  it('returns initial vendor name prompt', () => {
    expect(handler.getInitialPrompt()).toContain('vendor name');
  });

  it('happy path — collects all fields and creates vendor', async () => {
    vendorService.createVendor.mockResolvedValue({
      id: 5,
      factory_id: 10,
      name: 'ABC Steel',
      phone_number: '9876543210',
      gst_number: null,
      address: 'Delhi',
      email: null,
      notes: null,
      is_active: true,
    });

    const nameResult = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_NAME),
      'ABC Steel',
      context,
    );
    expect(nameResult.nextStep).toBe(VENDOR_ONBOARDING_STEP.VENDOR_PHONE);

    const phoneResult = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_PHONE, nameResult.sessionData!),
      '9876543210',
      context,
    );
    expect(phoneResult.nextStep).toBe(VENDOR_ONBOARDING_STEP.VENDOR_GST);

    const gstResult = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_GST, phoneResult.sessionData!),
      'SKIP',
      context,
    );
    expect(gstResult.nextStep).toBe(VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS);

    const finalResult = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS, gstResult.sessionData!),
      'Delhi',
      context,
    );

    expect(finalResult.completed).toBe(true);
    expect(finalResult.message).toContain('Vendor created successfully');
    expect(vendorService.createVendor).toHaveBeenCalledWith({
      factory_id: 10,
      name: 'ABC Steel',
      phone_number: '9876543210',
      gst_number: undefined,
      address: 'Delhi',
    });
  });

  it('rejects invalid phone and stays on phone step', async () => {
    const result = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_PHONE, { name: 'ABC' }),
      '123',
      context,
    );
    expect(result.nextStep).toBe(VENDOR_ONBOARDING_STEP.VENDOR_PHONE);
    expect(result.message).toContain('Invalid input');
  });

  it('rejects invalid GST and stays on GST step', async () => {
    const result = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_GST, {
        name: 'ABC',
        phone_number: '9876543210',
      }),
      'BADGST',
      context,
    );
    expect(result.nextStep).toBe(VENDOR_ONBOARDING_STEP.VENDOR_GST);
  });

  it('allows skip for GST and address', async () => {
    vendorService.createVendor.mockResolvedValue({
      id: 6,
      factory_id: 10,
      name: 'ABC',
      phone_number: '9876543210',
      gst_number: null,
      address: null,
      email: null,
      notes: null,
      is_active: true,
    });

    const gstResult = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_GST, {
        name: 'ABC',
        phone_number: '9876543210',
      }),
      'skip',
      context,
    );
    expect(gstResult.sessionData?.gst_number).toBeNull();

    const finalResult = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS, gstResult.sessionData!),
      'SKIP',
      context,
    );
    expect(finalResult.completed).toBe(true);
  });

  it('handles duplicate vendor name on create', async () => {
    vendorService.createVendor.mockRejectedValue(
      new ConflictException(
        'A vendor named "ABC Steel" already exists in this factory',
      ),
    );

    const result = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS, {
        name: 'ABC Steel',
        phone_number: '9876543210',
        gst_number: null,
      }),
      'Delhi',
      context,
    );

    expect(result.nextStep).toBe(VENDOR_ONBOARDING_STEP.VENDOR_NAME);
    expect(result.message).toContain('Could not create vendor');
  });

  it('handles duplicate vendor phone on create', async () => {
    vendorService.createVendor.mockRejectedValue(
      new ConflictException(
        'A vendor with phone number "9876543210" already exists in this factory',
      ),
    );

    const result = await handler.handleStep(
      baseSession(VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS, {
        name: 'ABC Steel',
        phone_number: '9876543210',
      }),
      'SKIP',
      context,
    );

    expect(result.nextStep).toBe(VENDOR_ONBOARDING_STEP.VENDOR_PHONE);
  });
});
