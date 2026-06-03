import { Injectable } from '@nestjs/common';
import {
  VENDOR_ONBOARDING_STEP,
  WORKFLOW_SKIP_KEYWORDS,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  IVendorOnboardingSessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';
import { VendorService } from 'src/services/vendors/vendors.service';
import {
  normalizeVendorAddress,
  normalizeVendorGst,
  normalizeVendorName,
  normalizeVendorPhone,
} from 'src/services/vendors/vendors.validation';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';

@Injectable()
export class VendorOnboardingWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.ONBOARD_VENDOR;
  readonly startCommand = WORKFLOW_START_COMMANDS.ONBOARD_VENDOR;
  readonly firstStep = VENDOR_ONBOARDING_STEP.VENDOR_NAME;

  constructor(private readonly vendorService: VendorService) {}

  getInitialPrompt(): string {
    return waSection(
      'Vendor onboarding',
      'What is the *vendor name*?',
    );
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const input = message.trim();
    const data = session.session_data as IVendorOnboardingSessionData;

    switch (session.current_step) {
      case VENDOR_ONBOARDING_STEP.VENDOR_NAME:
        return this.handleNameStep(session, input, data);
      case VENDOR_ONBOARDING_STEP.VENDOR_PHONE:
        return this.handlePhoneStep(session, input, data);
      case VENDOR_ONBOARDING_STEP.VENDOR_GST:
        return this.handleGstStep(session, input, data);
      case VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS:
        return this.handleAddressStep(session, input, data, context);
      default:
        return {
          message: waSection(
            'Workflow error',
            'This workflow step is not recognized. Please send /onboard_vendor to start again.',
          ),
          cancelled: true,
        };
    }
  }

  private handleNameStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IVendorOnboardingSessionData,
  ): WorkflowStepResult {
    try {
      const name = normalizeVendorName(input);
      return {
        message: 'What is the *vendor phone number*?',
        nextStep: VENDOR_ONBOARDING_STEP.VENDOR_PHONE,
        sessionData: { ...data, name },
      };
    } catch (error: any) {
      return {
        message: this.formatValidationError(
          'What is the *vendor name*?',
          error?.message,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private handlePhoneStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IVendorOnboardingSessionData,
  ): WorkflowStepResult {
    try {
      const phone_number = normalizeVendorPhone(input);
      return {
        message:
          'What is the *GST number*?\n\nReply *SKIP* if unavailable.',
        nextStep: VENDOR_ONBOARDING_STEP.VENDOR_GST,
        sessionData: { ...data, phone_number },
      };
    } catch (error: any) {
      return {
        message: this.formatValidationError(
          'What is the *vendor phone number*?',
          error?.message,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private handleGstStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IVendorOnboardingSessionData,
  ): WorkflowStepResult {
    if (this.isSkip(input)) {
      return {
        message:
          'What is the *address*?\n\nReply *SKIP* if unavailable.',
        nextStep: VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS,
        sessionData: { ...data, gst_number: null },
      };
    }

    try {
      const gst_number = normalizeVendorGst(input);
      return {
        message:
          'What is the *address*?\n\nReply *SKIP* if unavailable.',
        nextStep: VENDOR_ONBOARDING_STEP.VENDOR_ADDRESS,
        sessionData: { ...data, gst_number },
      };
    } catch (error: any) {
      return {
        message: this.formatValidationError(
          'What is the *GST number*? Reply *SKIP* if unavailable.',
          error?.message,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private async handleAddressStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IVendorOnboardingSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    let address: string | null = null;

    if (!this.isSkip(input)) {
      try {
        address = normalizeVendorAddress(input);
      } catch (error: any) {
        return {
          message: this.formatValidationError(
            'What is the *address*? Reply *SKIP* if unavailable.',
            error?.message,
          ),
          nextStep: session.current_step,
          sessionData: { ...data } as Record<string, unknown>,
        };
      }
    }

    const finalData: IVendorOnboardingSessionData = { ...data, address };

    try {
      const vendor = await this.vendorService.createVendor({
        factory_id: context.factoryId,
        name: finalData.name!,
        phone_number: finalData.phone_number!,
        gst_number: finalData.gst_number ?? undefined,
        address: finalData.address ?? undefined,
      });

      return {
        message: waSection(
          'Vendor created successfully',
          `*${vendor.name}* has been added to your factory.\n\n` +
            `🆔 Vendor #${vendor.id}\n` +
            `📞 ${vendor.phone_number}` +
            (vendor.gst_number ? `\n🧾 GST: ${vendor.gst_number}` : '') +
            (vendor.address ? `\n📍 ${vendor.address}` : ''),
        ),
        completed: true,
        sessionData: finalData as Record<string, unknown>,
      };
    } catch (error: any) {
      const msg = error?.message ?? 'Could not create vendor';
      if (msg.includes('name')) {
        return {
          message: waSection('Could not create vendor', `${msg}\n\nPlease send the *vendor name* again.`),
          nextStep: VENDOR_ONBOARDING_STEP.VENDOR_NAME,
        sessionData: { ...data, name: undefined } as Record<string, unknown>,
        };
      }
      if (msg.includes('phone')) {
        return {
          message: waSection(
            'Could not create vendor',
            `${msg}\n\nPlease send the *vendor phone number* again.`,
          ),
          nextStep: VENDOR_ONBOARDING_STEP.VENDOR_PHONE,
          sessionData: { ...finalData, phone_number: undefined } as Record<
            string,
            unknown
          >,
        };
      }
      return {
        message: waSection('Could not create vendor', msg),
        nextStep: session.current_step,
        sessionData: finalData as Record<string, unknown>,
      };
    }
  }

  private isSkip(input: string): boolean {
    return WORKFLOW_SKIP_KEYWORDS.includes(input.trim().toLowerCase());
  }

  private formatValidationError(prompt: string, errorMessage?: string): string {
    return waSection(
      'Invalid input',
      `${errorMessage ?? 'Please check your input and try again.'}\n\n${prompt}`,
    );
  }
}
