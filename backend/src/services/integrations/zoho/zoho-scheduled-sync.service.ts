import { Injectable, Logger } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { FactoryUser } from 'src/services/factories/factories.schema';
import { USER_ROLE } from 'src/services/users/users.constants';
import { IntegrationRepository } from '../integration.repository';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  SYNC_DIRECTION,
  SYNC_STATUS,
  SYNC_TRIGGER,
} from '../integration.constants';
import { IntegrationConnection } from '../integration.schema';
import {
  getZohoSyncIntervalMinutes,
  isZohoSyncEnabled,
} from './zoho-scheduled-sync.constants';
import { ZohoPullSyncService } from './zoho-pull-sync.service';
import type { ZohoPullSyncSummary } from './zoho-pull-sync.types';

export type ScheduledSyncConnectionResult =
  | { connectionId: number; factoryId: number; outcome: 'synced'; summary: ZohoPullSyncSummary }
  | { connectionId: number; factoryId: number; outcome: 'skipped'; reason: string }
  | { connectionId: number; factoryId: number; outcome: 'failed'; error: string };

export type ScheduledSyncBatchResult = {
  enabled: boolean;
  processed: number;
  synced: number;
  skipped: number;
  failed: number;
  results: ScheduledSyncConnectionResult[];
};

@Injectable()
export class ZohoScheduledSyncService {
  private readonly logger = new Logger(ZohoScheduledSyncService.name);
  private readonly factoryUserModel: typeof FactoryUser;

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly pullSyncService: ZohoPullSyncService,
    private readonly dbService: DbService,
  ) {
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

  /** Cron entry — respects enable flag and per-connection interval. */
  async runScheduledSyncIfDue(): Promise<ScheduledSyncBatchResult> {
    return this.runScheduledSync({ respectInterval: true });
  }

  /** Process all eligible active connections (cron batch). */
  async runScheduledSync(options?: {
    respectInterval?: boolean;
  }): Promise<ScheduledSyncBatchResult> {
    if (!isZohoSyncEnabled()) {
      return {
        enabled: false,
        processed: 0,
        synced: 0,
        skipped: 0,
        failed: 0,
        results: [],
      };
    }

    const connections =
      await this.integrationRepository.listActiveZohoInventoryConnections();
    const results: ScheduledSyncConnectionResult[] = [];

    for (const connection of connections) {
      results.push(
        await this.processConnection(connection, options?.respectInterval ?? false),
      );
    }

    return this.buildBatchResult(results);
  }

  /** Process one connection — used by tests and targeted recovery. */
  async runScheduledSyncForConnection(
    connectionId: number,
    factoryId: number,
    options?: { respectInterval?: boolean },
  ): Promise<ScheduledSyncConnectionResult> {
    if (!isZohoSyncEnabled()) {
      return {
        connectionId,
        factoryId,
        outcome: 'skipped',
        reason: 'scheduler_disabled',
      };
    }

    const connection = await this.integrationRepository.getConnection(
      connectionId,
      factoryId,
    );
    if (!connection) {
      return {
        connectionId,
        factoryId,
        outcome: 'skipped',
        reason: 'connection_not_found',
      };
    }

    return this.processConnection(
      connection,
      options?.respectInterval ?? false,
    );
  }

  private buildBatchResult(
    results: ScheduledSyncConnectionResult[],
  ): ScheduledSyncBatchResult {
    const synced = results.filter((r) => r.outcome === 'synced').length;
    const skipped = results.filter((r) => r.outcome === 'skipped').length;
    const failed = results.filter((r) => r.outcome === 'failed').length;

    if (synced > 0) {
      this.logger.log(`Scheduled Zoho pull sync completed for ${synced} connection(s)`);
    }

    return {
      enabled: true,
      processed: results.length,
      synced,
      skipped,
      failed,
      results,
    };
  }

  private async processConnection(
    connection: IntegrationConnection,
    respectInterval: boolean,
  ): Promise<ScheduledSyncConnectionResult> {
    const base = {
      connectionId: connection.id,
      factoryId: connection.factory_id,
    };

    if (connection.status !== INTEGRATION_CONNECTION_STATUS.ACTIVE) {
      return { ...base, outcome: 'skipped', reason: 'inactive_connection' };
    }
    if (connection.provider !== INTEGRATION_PROVIDER.ZOHO_INVENTORY) {
      return { ...base, outcome: 'skipped', reason: 'unsupported_provider' };
    }
    if (!connection.refresh_token) {
      return { ...base, outcome: 'skipped', reason: 'missing_refresh_token' };
    }

    const factory = await this.dbService.sqlService.Factory.findByPk(
      connection.factory_id,
    );
    if (!factory) {
      return { ...base, outcome: 'skipped', reason: 'factory_not_found' };
    }

    const running = await this.integrationRepository.findRunningPullSyncRun(
      connection.id,
      connection.factory_id,
    );
    if (running) {
      return { ...base, outcome: 'skipped', reason: 'sync_already_running' };
    }

    if (respectInterval && !(await this.isSyncDue(connection))) {
      return { ...base, outcome: 'skipped', reason: 'interval_not_elapsed' };
    }

    const userId = await this.resolveSyncUserId(connection);
    if (!userId) {
      return { ...base, outcome: 'skipped', reason: 'no_sync_user' };
    }

    try {
      const summary = await this.pullSyncService.runPullSync(
        connection.id,
        connection.factory_id,
        userId,
        { trigger: SYNC_TRIGGER.CRON, skipAuth: true },
      );
      return { ...base, outcome: 'synced', summary };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Scheduled sync failed for connection #${connection.id}: ${msg}`,
      );
      return { ...base, outcome: 'failed', error: msg.slice(0, 500) };
    }
  }

  private async isSyncDue(connection: IntegrationConnection): Promise<boolean> {
    const intervalMs = getZohoSyncIntervalMinutes() * 60 * 1000;
    const latest = await this.integrationRepository.getLatestPullSyncRun(
      connection.id,
      connection.factory_id,
      SYNC_TRIGGER.CRON,
    );
    if (!latest) {
      return true;
    }
    if (latest.status === SYNC_STATUS.RUNNING) {
      return false;
    }
    const anchor = latest.finished_at ?? latest.started_at;
    if (!anchor) {
      return true;
    }
    return anchor.getTime() + intervalMs <= Date.now();
  }

  private async resolveSyncUserId(
    connection: IntegrationConnection,
  ): Promise<number | null> {
    const metadata = (connection.metadata ?? {}) as {
      connected_by_user_id?: number;
    };
    if (
      Number.isFinite(metadata.connected_by_user_id) &&
      (metadata.connected_by_user_id ?? 0) > 0
    ) {
      return metadata.connected_by_user_id!;
    }

    const ownerLink = await this.factoryUserModel.findOne({
      where: {
        factory_id: connection.factory_id,
        role: USER_ROLE.OWNER,
      },
      order: [['id', 'ASC']],
    });
    return ownerLink?.user_id ?? null;
  }
}
