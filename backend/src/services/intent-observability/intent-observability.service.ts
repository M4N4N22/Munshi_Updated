import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, Logger } from '@nestjs/common';
import {
  CLASSIFICATION_OUTCOME,
  INBOUND_PATH,
  INTENT_EVENT_SCHEMA_VERSION,
  type ClassificationOutcome,
  type InboundPath,
} from './intent-observability.constants';
import { IntentObservabilityRepository } from './intent-observability.repository';
import {
  createObservabilitySession,
  type IntentObservabilitySession,
} from './intent-observability.session';
import { computeMisclassScore } from './intent-observability.scoring';

export interface KpiRates {
  total_events: number;
  general_chat_rate: number;
  llm_usage_rate: number;
  retry_rate: number;
  role_block_rate: number;
  workflow_failure_rate: number;
}

@Injectable()
export class IntentObservabilityService {
  private readonly logger = new Logger(IntentObservabilityService.name);
  private readonly storage = new AsyncLocalStorage<IntentObservabilitySession>();

  constructor(private readonly repository: IntentObservabilityRepository) {}

  getSession(): IntentObservabilitySession | undefined {
    return this.storage.getStore();
  }

  async runWithSession<T>(
    session: IntentObservabilitySession,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run(session, fn);
  }

  createSession(input: {
    phone: string;
    message: string;
    providerMessageId?: string;
    inboundPath?: InboundPath;
  }): IntentObservabilitySession {
    return createObservabilitySession({
      phone: input.phone,
      message: input.message,
      providerMessageId: input.providerMessageId,
      inboundPath: input.inboundPath ?? INBOUND_PATH.UNHANDLED,
    });
  }

  setInboundPath(path: InboundPath): void {
    const session = this.getSession();
    if (session) session.inboundPath = path;
  }

  setUserContext(ctx: {
    factoryId?: number | null;
    userId?: number | null;
    userRole?: string | null;
  }): void {
    const session = this.getSession();
    if (!session) return;
    if (ctx.factoryId != null) session.factoryId = ctx.factoryId;
    if (ctx.userId != null) session.userId = ctx.userId;
    if (ctx.userRole != null) session.userRole = ctx.userRole;
  }

  recordClassification(input: {
    predictedIntent?: string | null;
    classificationStage?: string | null;
    llmInvoked?: boolean;
    llmRawIntent?: string | null;
    postRuleApplied?: string[];
    latencyMs?: number | null;
    workerSlug?: string | null;
    departSlug?: string | null;
    taskId?: number | null;
    taskDescription?: string | null;
    deadline?: string | null;
    commandExecuted?: string | null;
  }): void {
    const session = this.getSession();
    if (!session) return;
    if (input.predictedIntent !== undefined) {
      session.predictedIntent = input.predictedIntent;
    }
    if (input.classificationStage !== undefined) {
      session.classificationStage = input.classificationStage;
    }
    if (input.llmInvoked !== undefined) session.llmInvoked = input.llmInvoked;
    if (input.llmRawIntent !== undefined) session.llmRawIntent = input.llmRawIntent;
    if (input.postRuleApplied) session.postRuleApplied = input.postRuleApplied;
    if (input.latencyMs !== undefined) {
      session.classificationLatencyMs = input.latencyMs;
    }
    if (input.workerSlug !== undefined) session.workerSlug = input.workerSlug;
    if (input.departSlug !== undefined) session.departSlug = input.departSlug;
    if (input.taskId !== undefined) session.taskId = input.taskId;
    if (input.taskDescription !== undefined) {
      session.taskDescription = input.taskDescription;
    }
    if (input.deadline !== undefined) session.deadline = input.deadline;
    if (input.commandExecuted !== undefined) {
      session.commandExecuted = input.commandExecuted;
    }
  }

  setOutcome(
    outcome: ClassificationOutcome,
    detail?: {
      outcomeDetail?: string | null;
      roleBlock?: boolean;
      workflowStarted?: boolean;
      workflowId?: number | null;
      isGeneralChat?: boolean;
      commandExecuted?: string | null;
    },
  ): void {
    const session = this.getSession();
    if (!session) return;
    session.outcome = outcome;
    if (detail?.outcomeDetail !== undefined) {
      session.outcomeDetail = detail.outcomeDetail;
    }
    if (detail?.roleBlock !== undefined) session.roleBlock = detail.roleBlock;
    if (detail?.workflowStarted !== undefined) {
      session.workflowStarted = detail.workflowStarted;
    }
    if (detail?.workflowId !== undefined) session.workflowId = detail.workflowId;
    if (detail?.isGeneralChat !== undefined) {
      session.isGeneralChat = detail.isGeneralChat;
    }
    if (detail?.commandExecuted !== undefined) {
      session.commandExecuted = detail.commandExecuted;
    }
  }

  /** Fire-and-forget persist — never throws to caller. */
  persistSession(session?: IntentObservabilitySession): void {
    const s = session ?? this.getSession();
    if (!s) return;
    void this.persistSessionAsync(s).catch((err) => {
      this.logger.warn(
        `Intent observability persist failed trace=${s.traceId}: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  private async persistSessionAsync(
    session: IntentObservabilitySession,
  ): Promise<void> {
    const prior = await this.repository.findPriorWithinWindow(
      session.phoneHash,
      session.startedAt,
      this.repository.retryWindowMs(),
    );

    const retryWithin60s = prior != null;
    const retryOfEventId = prior?.event_id ?? null;
    const misclassScore = computeMisclassScore(session, prior);

    await this.repository.create({
      event_id: session.eventId,
      trace_id: session.traceId,
      schema_version: INTENT_EVENT_SCHEMA_VERSION,
      factory_id: session.factoryId ?? null,
      user_id: session.userId ?? null,
      user_role: session.userRole ?? null,
      phone_hash: session.phoneHash,
      raw_length: session.rawLength,
      raw_hash: session.rawHash,
      raw_redacted: session.rawRedacted,
      provider_message_id: session.providerMessageId ?? null,
      inbound_path: session.inboundPath,
      predicted_intent: session.predictedIntent ?? null,
      classification_stage: session.classificationStage ?? null,
      llm_invoked: session.llmInvoked,
      llm_raw_intent: session.llmRawIntent ?? null,
      post_rule_applied: session.postRuleApplied,
      classification_latency_ms: session.classificationLatencyMs ?? null,
      worker_slug: session.workerSlug ?? null,
      depart_slug: session.departSlug ?? null,
      task_id: session.taskId ?? null,
      task_description: session.taskDescription ?? null,
      deadline: session.deadline ?? null,
      command_executed: session.commandExecuted ?? null,
      outcome: session.outcome,
      outcome_detail: session.outcomeDetail ?? null,
      role_block: session.roleBlock,
      workflow_started: session.workflowStarted,
      workflow_id: session.workflowId ?? null,
      is_general_chat: session.isGeneralChat,
      retry_within_60s: retryWithin60s,
      retry_of_event_id: retryOfEventId,
      misclass_score: misclassScore,
    });
  }

  async getKpiRates(filters: {
    factory_id?: number;
    user_role?: string;
    from?: string;
    to?: string;
  }): Promise<KpiRates> {
    const parsed = this.parseFilters(filters);
    const total = await this.repository.countEvents(parsed);
    if (total === 0) {
      return {
        total_events: 0,
        general_chat_rate: 0,
        llm_usage_rate: 0,
        retry_rate: 0,
        role_block_rate: 0,
        workflow_failure_rate: 0,
      };
    }

    const [
      generalChat,
      llmInvoked,
      retries,
      roleBlocks,
      workflowStarted,
      workflowFailed,
      mlFallback,
    ] = await Promise.all([
      this.repository.countFlag('is_general_chat', parsed),
      this.repository.countFlag('llm_invoked', parsed),
      this.repository.countFlag('retry_within_60s', parsed),
      this.repository.countFlag('role_block', parsed),
      this.repository.countFlag('workflow_started', parsed),
      this.repository.countWorkflowFailed(parsed),
      this.repository.countMlFallback(parsed),
    ]);

    return {
      total_events: total,
      general_chat_rate: generalChat / total,
      llm_usage_rate: mlFallback > 0 ? llmInvoked / mlFallback : 0,
      retry_rate: retries / total,
      role_block_rate: roleBlocks / total,
      workflow_failure_rate:
        workflowStarted > 0 ? workflowFailed / workflowStarted : 0,
    };
  }

  async getReviewQueue(params: {
    factory_id?: number;
    limit?: number;
    offset?: number;
  }) {
    const { rows, total } = await this.repository.listReviewQueue(params);
    return {
      total,
      items: rows.map((row) => ({
        event_id: row.event_id,
        trace_id: row.trace_id,
        created_at: row.created_at,
        factory_id: row.factory_id,
        user_role: row.user_role,
        inbound_path: row.inbound_path,
        predicted_intent: row.predicted_intent,
        outcome: row.outcome,
        raw_redacted: row.raw_redacted,
        misclass_score: row.misclass_score,
        retry_within_60s: row.retry_within_60s,
        retry_of_event_id: row.retry_of_event_id,
        role_block: row.role_block,
        is_general_chat: row.is_general_chat,
      })),
    };
  }

  async markReviewed(eventId: string): Promise<void> {
    await this.repository.markReviewed(eventId);
  }

  private parseFilters(filters: {
    factory_id?: number;
    user_role?: string;
    from?: string;
    to?: string;
  }) {
    return {
      factory_id: filters.factory_id,
      user_role: filters.user_role,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    };
  }

  /** Helpers for whatsapp integration */
  static readonly OUTCOME = CLASSIFICATION_OUTCOME;
  static readonly PATH = INBOUND_PATH;
}
