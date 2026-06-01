import { Injectable } from '@nestjs/common';
import {
  BUSINESS_DISCOVERY_STATUS,
  DISCOVERY_BUCKET,
  DISCOVERY_BUCKET_LABELS,
  DISCOVERY_BUCKET_ORDER,
  DiscoveryBucket,
} from 'src/services/business-discovery/business-discovery.constants';
import { BusinessDiscoveryService } from 'src/services/business-discovery/business-discovery.service';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import {
  BUSINESS_DISCOVERY_STEP,
  WORKFLOW_SKIP_KEYWORDS,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  IBusinessDiscoverySessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';

const BUCKET_FIELDS: Record<DiscoveryBucket, Array<{ key: string; prompt: string }>> = {
  [DISCOVERY_BUCKET.BUSINESS_IDENTITY]: [
    { key: 'business_name', prompt: 'What is your *business name*?' },
    { key: 'address', prompt: 'What is your business *address*?' },
    { key: 'industry', prompt: 'Which *industry* are you in?' },
    { key: 'business_type', prompt: 'What *type* of business is it? (e.g. manufacturing, trading)' },
  ],
  [DISCOVERY_BUCKET.ORGANIZATION]: [
    { key: 'departments', prompt: 'Name a *department* (or type SKIP).' },
    { key: 'managers', prompt: 'Any *managers* to note? (or SKIP)' },
    { key: 'workers', prompt: 'Team *workers* overview? (or SKIP)' },
  ],
  [DISCOVERY_BUCKET.INVENTORY]: [
    { key: 'categories', prompt: 'Main inventory *categories*? (or SKIP)' },
    { key: 'locations', prompt: 'Storage *locations*? (or SKIP)' },
    { key: 'items', prompt: 'Key *items* you stock? (or SKIP)' },
  ],
  [DISCOVERY_BUCKET.VENDORS]: [
    { key: 'vendor_list', prompt: 'Name a key *vendor* (or SKIP).' },
    { key: 'vendor_categories', prompt: 'Vendor *categories*? (or SKIP)' },
    { key: 'vendor_contacts', prompt: 'Important vendor *contacts*? (or SKIP)' },
  ],
};

@Injectable()
export class BusinessDiscoveryWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.BUSINESS_DISCOVERY;
  readonly startCommand = WORKFLOW_START_COMMANDS.BUSINESS_DISCOVERY;
  readonly firstStep = BUSINESS_DISCOVERY_STEP.MENU;

  constructor(private readonly discoveryService: BusinessDiscoveryService) {}

  getInitialPrompt(): string {
    return this.menuMessage();
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const input = message.trim();
    const data = session.session_data as IBusinessDiscoverySessionData;

    if (this.isPauseCommand(input)) {
      await this.discoveryService.pause(context.factoryId);
      return {
        message: waSection(
          'Discovery paused',
          'No problem — Munshi stays fully usable.\nResume anytime with /business_discovery or "continue setup".',
        ),
        completed: true,
        sessionData: data as Record<string, unknown>,
      };
    }

    switch (session.current_step) {
      case BUSINESS_DISCOVERY_STEP.MENU:
        return this.handleMenu(input, data, context);
      case BUSINESS_DISCOVERY_STEP.COLLECT:
        return this.handleCollect(input, data, context);
      default:
        return {
          message: waSection(
            'Discovery',
            'Send /business_discovery to continue introducing your business.',
          ),
          cancelled: true,
        };
    }
  }

  private async handleMenu(
    input: string,
    data: IBusinessDiscoverySessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const lower = input.toLowerCase();
    let bucket = data.current_bucket;

    if (!bucket) {
      const num = Number(lower);
      if (num >= 1 && num <= DISCOVERY_BUCKET_ORDER.length) {
        bucket = DISCOVERY_BUCKET_ORDER[num - 1];
      } else if (lower.includes('identity') || lower.includes('company')) {
        bucket = DISCOVERY_BUCKET.BUSINESS_IDENTITY;
      } else if (lower.includes('org') || lower.includes('team')) {
        bucket = DISCOVERY_BUCKET.ORGANIZATION;
      } else if (lower.includes('inventory') || lower.includes('stock')) {
        bucket = DISCOVERY_BUCKET.INVENTORY;
      } else if (lower.includes('vendor')) {
        bucket = DISCOVERY_BUCKET.VENDORS;
      } else if (lower.includes('progress') || lower.includes('score')) {
        const progress = await this.discoveryService.getProgress(context.factoryId);
        return {
          message: waSection(
            'Business readiness',
            `Overall: *${progress.readiness.overall}%*\n` +
              `Identity ${progress.readiness.identity}% · Org ${progress.readiness.organization}% · ` +
              `Inventory ${progress.readiness.inventory}% · Vendors ${progress.readiness.vendors}%`,
          ),
          nextStep: BUSINESS_DISCOVERY_STEP.MENU,
          sessionData: data as Record<string, unknown>,
        };
      } else {
        bucket = DISCOVERY_BUCKET.BUSINESS_IDENTITY;
      }
    }

    await this.discoveryService.resume(context.factoryId);
    const fieldIndex = 0;
    const fields = BUCKET_FIELDS[bucket];
    return {
      message: fields[fieldIndex].prompt,
      nextStep: BUSINESS_DISCOVERY_STEP.COLLECT,
      sessionData: {
        ...data,
        current_bucket: bucket,
        field_index: fieldIndex,
      } as Record<string, unknown>,
    };
  }

  private async handleCollect(
    input: string,
    data: IBusinessDiscoverySessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const bucket = data.current_bucket ?? DISCOVERY_BUCKET.BUSINESS_IDENTITY;
    const fields = BUCKET_FIELDS[bucket];
    let fieldIndex = data.field_index ?? 0;

    if (!WORKFLOW_SKIP_KEYWORDS.includes(input.toLowerCase())) {
      const field = fields[fieldIndex];
      await this.discoveryService.recordBucketField(
        context.factoryId,
        bucket,
        field.key,
        input,
      );
    }

    fieldIndex += 1;
    if (fieldIndex >= fields.length) {
      const progress = await this.discoveryService.getProgress(context.factoryId);
      return {
        message: waSection(
          `${DISCOVERY_BUCKET_LABELS[bucket]} saved`,
          `Overall readiness: *${progress.readiness.overall}%*\n\n` +
            this.menuMessage(),
        ),
        nextStep: BUSINESS_DISCOVERY_STEP.MENU,
        sessionData: {
          current_bucket: undefined,
          field_index: undefined,
        } as Record<string, unknown>,
      };
    }

    return {
      message: fields[fieldIndex].prompt,
      nextStep: BUSINESS_DISCOVERY_STEP.COLLECT,
      sessionData: {
        ...data,
        current_bucket: bucket,
        field_index: fieldIndex,
      } as Record<string, unknown>,
    };
  }

  private menuMessage(): string {
    const lines = DISCOVERY_BUCKET_ORDER.map(
      (b, i) => `${i + 1}. ${DISCOVERY_BUCKET_LABELS[b]}`,
    ).join('\n');
    return waSection(
      'Business discovery',
      'Tell Munshi about your business at your pace — today or months later.\n\n' +
        `Choose a topic:\n${lines}\n\n` +
        'Reply with a number, topic name, or just start typing.\n' +
        'Send *pause* anytime. Upload documents anytime — they also count.',
    );
  }

  private isPauseCommand(input: string): boolean {
    const v = input.toLowerCase();
    return v === 'pause' || v === '/pause' || v === 'later';
  }
}
