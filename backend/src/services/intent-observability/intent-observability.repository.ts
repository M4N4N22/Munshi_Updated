import { Injectable } from '@nestjs/common';
import { Op, WhereOptions } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import { IntentClassificationEvent } from './intent-classification-event.schema';
import {
  MISCLASS_REVIEW_THRESHOLD,
  RETRY_WINDOW_MS,
} from './intent-observability.constants';

export interface IntentEventFilters {
  factory_id?: number;
  user_role?: string;
  from?: Date;
  to?: Date;
}

export interface CreateIntentEventInput {
  event_id: string;
  trace_id: string;
  schema_version: string;
  factory_id?: number | null;
  user_id?: number | null;
  user_role?: string | null;
  phone_hash: string;
  raw_length: number;
  raw_hash: string;
  raw_redacted?: string | null;
  provider_message_id?: string | null;
  inbound_path: string;
  predicted_intent?: string | null;
  classification_stage?: string | null;
  llm_invoked?: boolean;
  llm_raw_intent?: string | null;
  post_rule_applied?: string[];
  classification_latency_ms?: number | null;
  worker_slug?: string | null;
  depart_slug?: string | null;
  task_id?: number | null;
  task_description?: string | null;
  deadline?: string | null;
  command_executed?: string | null;
  outcome: string;
  outcome_detail?: string | null;
  role_block?: boolean;
  workflow_started?: boolean;
  workflow_id?: number | null;
  is_general_chat?: boolean;
  retry_within_60s?: boolean;
  retry_of_event_id?: string | null;
  misclass_score?: number;
}

@Injectable()
export class IntentObservabilityRepository {
  private readonly model: typeof IntentClassificationEvent;

  constructor(dbService: DbService) {
    this.model = dbService.sqlService.IntentClassificationEvent;
  }

  async create(input: CreateIntentEventInput): Promise<IntentClassificationEvent> {
    return this.model.create(input as any);
  }

  async findRecentByPhoneHash(
    phoneHash: string,
    since: Date,
  ): Promise<IntentClassificationEvent | null> {
    return this.model.findOne({
      where: {
        phone_hash: phoneHash,
        created_at: { [Op.gte]: since },
      },
      order: [['created_at', 'DESC']],
    });
  }

  async findPriorWithinWindow(
    phoneHash: string,
    before: Date,
    windowMs: number,
  ): Promise<IntentClassificationEvent | null> {
    const since = new Date(before.getTime() - windowMs);
    return this.model.findOne({
      where: {
        phone_hash: phoneHash,
        created_at: {
          [Op.gte]: since,
          [Op.lt]: before,
        },
      },
      order: [['created_at', 'DESC']],
    });
  }

  private buildWhere(filters: IntentEventFilters): WhereOptions {
    const where: WhereOptions = {};
    if (filters.factory_id != null) {
      where.factory_id = filters.factory_id;
    }
    if (filters.user_role) {
      where.user_role = filters.user_role;
    }
    if (filters.from || filters.to) {
      where.created_at = {
        ...(filters.from ? { [Op.gte]: filters.from } : {}),
        ...(filters.to ? { [Op.lte]: filters.to } : {}),
      };
    }
    return where;
  }

  async countEvents(filters: IntentEventFilters): Promise<number> {
    return this.model.count({ where: this.buildWhere(filters) });
  }

  async countByOutcome(
    outcome: string,
    filters: IntentEventFilters,
  ): Promise<number> {
    return this.model.count({
      where: { ...this.buildWhere(filters), outcome },
    });
  }

  async countFlag(
    field: 'is_general_chat' | 'llm_invoked' | 'role_block' | 'retry_within_60s' | 'workflow_started',
    filters: IntentEventFilters,
  ): Promise<number> {
    return this.model.count({
      where: { ...this.buildWhere(filters), [field]: true },
    });
  }

  async countMlFallback(filters: IntentEventFilters): Promise<number> {
    return this.model.count({
      where: { ...this.buildWhere(filters), inbound_path: 'ml_fallback' },
    });
  }

  async countWorkflowFailed(filters: IntentEventFilters): Promise<number> {
    return this.model.count({
      where: { ...this.buildWhere(filters), outcome: 'workflow_failed' },
    });
  }

  async listReviewQueue(params: {
    factory_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: IntentClassificationEvent[]; total: number }> {
    const where: WhereOptions = {
      reviewed_at: null,
      misclass_score: { [Op.gte]: MISCLASS_REVIEW_THRESHOLD },
    };
    if (params.factory_id != null) {
      where.factory_id = params.factory_id;
    }
    const { rows, count } = await this.model.findAndCountAll({
      where,
      order: [
        ['misclass_score', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
    return { rows, total: count };
  }

  async markReviewed(eventId: string): Promise<void> {
    await this.model.update(
      { reviewed_at: new Date() },
      { where: { event_id: eventId } },
    );
  }

  /** Used by retry detection — default 60s window. */
  retryWindowMs(): number {
    return RETRY_WINDOW_MS;
  }
}
