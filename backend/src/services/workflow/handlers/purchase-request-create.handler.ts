import { Injectable } from '@nestjs/common';
import { PurchaseRequestService } from 'src/services/purchase-requests/purchase-requests.service';
import { VendorService } from 'src/services/vendors/vendors.service';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import {
  formatNamedEntityList,
  resolveNamedSelection,
} from 'src/services/inventory/inventory.validation';
import {
  canApprovePurchaseRequests,
  isNo,
  isYes,
  normalizeQuantity,
} from 'src/services/purchase-requests/purchase-requests.validation';
import {
  PURCHASE_REQUEST_CREATE_STEP,
  WORKFLOW_SKIP_KEYWORDS,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  IPurchaseRequestCreateSessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';

@Injectable()
export class PurchaseRequestCreateWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.PURCHASE_REQUEST_CREATE;
  readonly startCommand = WORKFLOW_START_COMMANDS.PURCHASE_REQUEST_CREATE;
  readonly firstStep = PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION;

  constructor(
    private readonly purchaseRequestService: PurchaseRequestService,
    private readonly vendorService: VendorService,
  ) {}

  getInitialPrompt(): string {
    return waSection(
      'Purchase request',
      'What do you need to purchase?\n\nReply with a short *title* (e.g. Restock cement bags).',
    );
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const input = message.trim();
    const data = session.session_data as IPurchaseRequestCreateSessionData;

    switch (session.current_step) {
      case PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION:
        return this.handleRequestCreation(session, input, data, context);
      case PURCHASE_REQUEST_CREATE_STEP.APPROVAL:
        return this.handleApproval(session, input, data, context);
      case PURCHASE_REQUEST_CREATE_STEP.VENDOR_ASSIGNMENT:
        return this.handleVendorAssignment(session, input, data, context);
      case PURCHASE_REQUEST_CREATE_STEP.CLOSE:
        return this.handleClose(session, input, data, context);
      default:
        return {
          message: waSection(
            'Workflow error',
            'Unknown step. Send /purchase_request_create to start again.',
          ),
          cancelled: true,
        };
    }
  }

  private async handleRequestCreation(
    session: IWorkflowSessionRecord,
    input: string,
    data: IPurchaseRequestCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    if (!data.title) {
      if (input.length < 3) {
        return {
          message: waSection(
            'Invalid title',
            'Please provide a descriptive purchase request title.',
          ),
          nextStep: PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION,
          sessionData: { ...data } as Record<string, unknown>,
        };
      }
      return {
        message: waSection(
          'Item details',
          `Title: *${input}*\n\nWhat *item* do you need? (name or inventory item)`,
        ),
        nextStep: PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION,
        sessionData: { ...data, title: input } as Record<string, unknown>,
      };
    }

    if (!data.item_name) {
      return {
        message: 'What *quantity* do you need?',
        nextStep: PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION,
        sessionData: { ...data, item_name: input } as Record<string, unknown>,
      };
    }

    if (!data.item_quantity) {
      try {
        const qty = normalizeQuantity(input);
        return {
          message: waSection(
            'Add another item?',
            'Reply *YES* to add another item or *NO* to submit for approval.',
          ),
          nextStep: PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION,
          sessionData: {
            ...data,
            item_quantity: qty,
            item_unit: data.item_unit ?? 'pcs',
          } as Record<string, unknown>,
        };
      } catch (error: any) {
        return {
          message: waSection(
            'Invalid quantity',
            `${error?.message ?? 'Enter a positive number.'}`,
          ),
          nextStep: PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION,
          sessionData: { ...data } as Record<string, unknown>,
        };
      }
    }

    if (isYes(input)) {
      const items = [
        ...(data.items ?? []),
        {
          item_name: data.item_name!,
          requested_quantity: data.item_quantity!,
          unit: data.item_unit ?? 'pcs',
          inventory_item_id: data.inventory_item_id ?? null,
        },
      ];
      return {
        message: 'Next item name?',
        nextStep: PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION,
        sessionData: {
          title: data.title,
          items,
          adding_more: true,
        } as Record<string, unknown>,
      };
    }

    if (!isNo(input)) {
      return {
        message: 'Reply *YES* to add another item or *NO* to submit.',
        nextStep: PURCHASE_REQUEST_CREATE_STEP.REQUEST_CREATION,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }

    const items = [
      ...(data.items ?? []),
      {
        item_name: data.item_name!,
        requested_quantity: data.item_quantity!,
        unit: data.item_unit ?? 'pcs',
        inventory_item_id: data.inventory_item_id ?? null,
      },
    ];

    const created = await this.purchaseRequestService.createFromWorkflowSession({
      factoryId: context.factoryId,
      requestedBy: context.userId,
      title: data.title!,
      description: data.description ?? null,
      items,
      submit: true,
    });

    if (canApprovePurchaseRequests(context.role)) {
      return {
        message: waSection(
          'Request created',
          `Purchase request *${created.request_number}* created with ${items.length} item(s).\n\nApprove request *${created.request_number}*?\nReply *YES* or *NO*.`,
        ),
        nextStep: PURCHASE_REQUEST_CREATE_STEP.APPROVAL,
        sessionData: {
          purchase_request_id: created.id,
          title: data.title,
          items,
        } as Record<string, unknown>,
      };
    }

    return {
      message: waSection(
        'Request submitted',
        `Purchase request *${created.request_number}* submitted for owner/manager approval.`,
      ),
      completed: true,
      sessionData: {
        purchase_request_id: created.id,
        title: data.title,
        items,
      } as Record<string, unknown>,
    };
  }

  private async handleApproval(
    session: IWorkflowSessionRecord,
    input: string,
    data: IPurchaseRequestCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const prId = data.purchase_request_id;
    if (!prId) {
      return { message: 'Missing request id.', cancelled: true };
    }

    if (isYes(input)) {
      await this.purchaseRequestService.approvePurchaseRequest(
        prId,
        context.factoryId,
        context.userId,
      );
      const vendors = await this.vendorService.listVendors(context.factoryId, {
        activeOnly: true,
        limit: 20,
      });
      const list = formatNamedEntityList(
        vendors.data.map((v) => ({ id: v.id, name: v.name })),
        'No vendors found. Create a vendor first via /onboard_vendor.',
      );
      if (!vendors.data.length) {
        return {
          message: waSection('Approved', `Request approved.\n\n${list}`),
          completed: true,
        };
      }
      return {
        message: waSection(
          'Assign vendor',
          `Request approved.\n\nSelect a *vendor*:\n\n${list}`,
        ),
        nextStep: PURCHASE_REQUEST_CREATE_STEP.VENDOR_ASSIGNMENT,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }

    if (isNo(input)) {
      await this.purchaseRequestService.rejectPurchaseRequest(
        prId,
        context.factoryId,
        context.userId,
        'Rejected during workflow',
      );
      return {
        message: waSection('Rejected', 'Purchase request rejected.'),
        completed: true,
      };
    }

    return {
      message: 'Reply *YES* to approve or *NO* to reject.',
      nextStep: PURCHASE_REQUEST_CREATE_STEP.APPROVAL,
      sessionData: { ...data } as Record<string, unknown>,
    };
  }

  private async handleVendorAssignment(
    session: IWorkflowSessionRecord,
    input: string,
    data: IPurchaseRequestCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const prId = data.purchase_request_id;
    if (!prId) {
      return { message: 'Missing request id.', cancelled: true };
    }

    if (WORKFLOW_SKIP_KEYWORDS.includes(input.toLowerCase())) {
      return {
        message: waSection(
          'Vendor skipped',
          'Reply *YES* to close the purchase request without a vendor.',
        ),
        nextStep: PURCHASE_REQUEST_CREATE_STEP.CLOSE,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }

    try {
      const vendors = await this.vendorService.listVendors(context.factoryId, {
        activeOnly: true,
        limit: 50,
      });
      const selected = resolveNamedSelection(
        input,
        vendors.data.map((v) => ({ id: v.id, name: v.name })),
        'vendor',
      );
      await this.purchaseRequestService.assignVendor(
        prId,
        context.factoryId,
        selected.id,
        context.userId,
      );
      return {
        message: waSection(
          'Vendor assigned',
          `Vendor *${selected.name}* assigned.\n\nReply *YES* to close this purchase request.`,
        ),
        nextStep: PURCHASE_REQUEST_CREATE_STEP.CLOSE,
        sessionData: { ...data } as Record<string, unknown>,
      };
    } catch (error: any) {
      const vendors = await this.vendorService.listVendors(context.factoryId, {
        activeOnly: true,
        limit: 20,
      });
      return {
        message: waSection(
          'Select vendor',
          `${error?.message ?? 'Invalid selection.'}\n\n${formatNamedEntityList(
            vendors.data.map((v) => ({ id: v.id, name: v.name })),
            'No vendors.',
          )}\n\nOr reply *SKIP* to skip vendor assignment.`,
        ),
        nextStep: PURCHASE_REQUEST_CREATE_STEP.VENDOR_ASSIGNMENT,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private async handleClose(
    session: IWorkflowSessionRecord,
    input: string,
    data: IPurchaseRequestCreateSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const prId = data.purchase_request_id;
    if (!prId) {
      return { message: 'Missing request id.', cancelled: true };
    }

    if (!isYes(input)) {
      return {
        message: 'Reply *YES* to close the purchase request.',
        nextStep: PURCHASE_REQUEST_CREATE_STEP.CLOSE,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }

    try {
      await this.purchaseRequestService.closePurchaseRequest(
        prId,
        context.factoryId,
        context.userId,
      );
    } catch {
      /* may already be closed or not assigned — finish workflow */
    }

    return {
      message: waSection(
        'Complete',
        `Purchase request workflow finished for *${data.title ?? 'request'}*.`,
      ),
      completed: true,
    };
  }
}
