import { Injectable } from '@nestjs/common';
import {
  ACTIVE_DISCOVERY_BUCKET_ORDER,
  ActiveDiscoveryBucket,
  DISCOVERY_BUCKET,
  DISCOVERY_BUCKET_LABELS,
  normalizeDiscoveryBucket,
} from 'src/services/business-discovery/business-discovery.constants';
import {
  BUCKET_FIELD_DEFINITIONS,
  listActiveBucketMenuLines,
  REPEATABLE_DISCOVERY_BUCKETS,
  resumePromptLabel,
} from 'src/services/business-discovery/business-discovery.fields';
import { isOperationalCommand } from 'src/services/business-discovery/business-discovery.hygiene';
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
    let bucket = data.current_bucket
      ? normalizeDiscoveryBucket(data.current_bucket)
      : null;

    if (!bucket) {
      const num = Number(lower);
      if (num >= 1 && num <= ACTIVE_DISCOVERY_BUCKET_ORDER.length) {
        bucket = ACTIVE_DISCOVERY_BUCKET_ORDER[num - 1];
      } else if (lower.includes('identity') || lower.includes('company')) {
        bucket = DISCOVERY_BUCKET.BUSINESS_IDENTITY;
      } else if (lower.includes('org') || lower.includes('structure')) {
        bucket = DISCOVERY_BUCKET.ORGANIZATION_STRUCTURE;
      } else if (lower.includes('manager')) {
        bucket = DISCOVERY_BUCKET.MANAGER_DISCOVERY;
      } else if (lower.includes('workforce') || lower.includes('worker')) {
        bucket = DISCOVERY_BUCKET.WORKFORCE_DISCOVERY;
      } else if (lower.includes('inventory') || lower.includes('stock')) {
        bucket = DISCOVERY_BUCKET.INVENTORY_DISCOVERY;
      } else if (lower.includes('vendor')) {
        bucket = DISCOVERY_BUCKET.VENDOR_DISCOVERY;
      } else if (lower.includes('progress') || lower.includes('score')) {
        const progress = await this.discoveryService.getProgress(context.factoryId);
        const r = progress.readiness;
        return {
          message: waSection(
            'Business readiness',
            `Overall: *${r.overall}%*\n` +
              `Identity ${r.identity}% · Org ${r.organization_structure}% · ` +
              `Managers ${r.managers}% · Workforce ${r.workforce}% · ` +
              `Inventory ${r.inventory}% · Vendors ${r.vendors}%`,
          ),
          nextStep: BUSINESS_DISCOVERY_STEP.MENU,
          sessionData: data as Record<string, unknown>,
        };
      } else if (!isOperationalCommand(input)) {
        bucket = DISCOVERY_BUCKET.BUSINESS_IDENTITY;
      } else {
        return {
          message: waSection(
            'Discovery',
            'That looks like a daily command. Pick a topic number from the menu, or send *pause*.',
          ),
          nextStep: BUSINESS_DISCOVERY_STEP.MENU,
          sessionData: data as Record<string, unknown>,
        };
      }
    }

    await this.discoveryService.resume(context.factoryId);
    const entityIndex = data.current_bucket === bucket ? (data.entity_index ?? 0) : 0;
    const fieldIndex = data.current_bucket === bucket ? (data.field_index ?? 0) : 0;
    const fields = BUCKET_FIELD_DEFINITIONS[bucket];
    const resume = data.current_bucket ? `\nResuming: ${resumePromptLabel(bucket, entityIndex, fieldIndex)}` : '';
    return {
      message: fields[fieldIndex].prompt + resume,
      nextStep: BUSINESS_DISCOVERY_STEP.COLLECT,
      sessionData: {
        ...data,
        current_bucket: bucket,
        field_index: fieldIndex,
        entity_index: entityIndex,
        awaiting_more: false,
      } as Record<string, unknown>,
    };
  }

  private async handleCollect(
    input: string,
    data: IBusinessDiscoverySessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const bucket = normalizeDiscoveryBucket(
      data.current_bucket ?? DISCOVERY_BUCKET.BUSINESS_IDENTITY,
    )!;
    const fields = BUCKET_FIELD_DEFINITIONS[bucket];
    let fieldIndex = data.field_index ?? 0;
    let entityIndex = data.entity_index ?? 0;

    if (data.awaiting_more) {
      const lower = input.toLowerCase();
      if (lower === 'yes' || lower === 'y' || lower === 'ha' || lower === 'haan') {
        entityIndex += 1;
        fieldIndex = 0;
      } else {
        return this.finishBucket(bucket, data, context, {});
      }
    } else if (!WORKFLOW_SKIP_KEYWORDS.includes(input.toLowerCase())) {
      if (isOperationalCommand(input)) {
        const field = fields[fieldIndex];
        return {
          message: waSection(
            'Discovery only',
            `That looks like an operational command — it was *not* saved to onboarding.\n\n` +
              `Please answer: ${field.prompt}\nOr send *pause* to stop.`,
          ),
          nextStep: BUSINESS_DISCOVERY_STEP.COLLECT,
          sessionData: data as Record<string, unknown>,
        };
      }
      const field = fields[fieldIndex];
      const isRepeatable = REPEATABLE_DISCOVERY_BUCKETS.includes(bucket);
      await this.discoveryService.recordBucketField(
        context.factoryId,
        bucket,
        field.key,
        input,
        isRepeatable ? { entityIndex } : undefined,
      );
    }

    if (!data.awaiting_more) {
      fieldIndex += 1;
    }

    if (fieldIndex >= fields.length) {
      if (REPEATABLE_DISCOVERY_BUCKETS.includes(bucket)) {
        const role = bucket === DISCOVERY_BUCKET.MANAGER_DISCOVERY ? 'manager' : 'worker';
        return {
          message: waSection(
            `${DISCOVERY_BUCKET_LABELS[bucket]} saved`,
            `${role.charAt(0).toUpperCase() + role.slice(1)} #${entityIndex + 1} saved.\n` +
              `Add another ${role}? Reply *yes* or *skip* to return to menu.`,
          ),
          nextStep: BUSINESS_DISCOVERY_STEP.COLLECT,
          sessionData: {
            current_bucket: bucket,
            field_index: 0,
            entity_index: entityIndex,
            awaiting_more: true,
          } as Record<string, unknown>,
        };
      }
      return this.finishBucket(bucket, data, context, {
        current_bucket: undefined,
        field_index: undefined,
        entity_index: undefined,
        awaiting_more: false,
      });
    }

    return {
      message: fields[fieldIndex].prompt,
      nextStep: BUSINESS_DISCOVERY_STEP.COLLECT,
      sessionData: {
        ...data,
        current_bucket: bucket,
        field_index: fieldIndex,
        entity_index: entityIndex,
        awaiting_more: false,
      } as Record<string, unknown>,
    };
  }

  private async finishBucket(
    bucket: ActiveDiscoveryBucket,
    data: IBusinessDiscoverySessionData,
    context: WorkflowUserContext,
    sessionPatch: Record<string, unknown>,
  ): Promise<WorkflowStepResult> {
    const progress = await this.discoveryService.getProgress(context.factoryId);
    return {
      message: waSection(
        `${DISCOVERY_BUCKET_LABELS[bucket]} saved`,
        `Overall readiness: *${progress.readiness.overall}%*\n\n` + this.menuMessage(),
      ),
      nextStep: BUSINESS_DISCOVERY_STEP.MENU,
      sessionData: {
        ...data,
        ...sessionPatch,
      } as Record<string, unknown>,
    };
  }

  private menuMessage(): string {
    return waSection(
      'Business discovery',
      'Tell Munshi about your business at your pace — today or months later.\n\n' +
        `Choose a topic:\n${listActiveBucketMenuLines()}\n\n` +
        'Reply with a number, topic name, or just start typing.\n' +
        'Send *pause* anytime. Upload documents anytime — they also count.',
    );
  }

  private isPauseCommand(input: string): boolean {
    const v = input.toLowerCase();
    return v === 'pause' || v === '/pause' || v === 'later';
  }
}
