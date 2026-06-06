import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { INVENTORY_REFERENCE_TYPE } from 'src/services/inventory/inventory.constants';
import { InventoryRepository } from 'src/services/inventory/inventory.repository';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import {
  formatQuantity,
  normalizeInventoryName,
  normalizeSku,
  normalizeUnit,
} from 'src/services/inventory/inventory.validation';
import { IntegrationAuthValidationService } from '../integration-auth.validation';
import { IntegrationRepository } from '../integration.repository';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  ITEM_MAPPING_SYNC_STATUS,
  SYNC_DIRECTION,
  SYNC_STATUS,
  SYNC_TRIGGER,
} from '../integration.constants';
import { TokenCryptoService } from '../token-crypto.service';
import { ZohoInventoryClient } from './zoho-inventory.client';
import { ZohoInventoryItemRecord } from './zoho-inventory.types';
import { ZohoOAuthService } from './zoho-oauth.service';
import type {
  ZohoPullItemFailure,
  ZohoPullSyncSummary,
} from './zoho-pull-sync.types';
import type { SyncTrigger } from '../integration.constants';
import { IntegrationSyncFailedPublisher } from '../integration-sync-failed.publisher';

export type { ZohoPullItemFailure, ZohoPullSyncSummary };

export type ZohoPullSyncOptions = {
  trigger?: SyncTrigger;
  skipAuth?: boolean;
};

type ItemOutcome = 'added' | 'updated' | 'failed';

@Injectable()
export class ZohoPullSyncService {
  private readonly logger = new Logger(ZohoPullSyncService.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly transactionService: InventoryTransactionService,
    private readonly zohoOAuthService: ZohoOAuthService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly zohoInventoryClient: ZohoInventoryClient,
    private readonly authValidation: IntegrationAuthValidationService,
    private readonly syncFailedPublisher: IntegrationSyncFailedPublisher,
  ) {}

  async runPullSync(
    connectionId: number,
    factoryId: number,
    userId: number,
    options?: ZohoPullSyncOptions,
  ): Promise<ZohoPullSyncSummary> {
    if (!options?.skipAuth) {
      await this.authValidation.assertCanManageIntegrations(factoryId, userId);
    }

    const connection = await this.integrationRepository.getConnection(
      connectionId,
      factoryId,
    );
    if (!connection) {
      throw new NotFoundException(
        `Integration connection #${connectionId} not found for factory #${factoryId}`,
      );
    }
    if (connection.status !== INTEGRATION_CONNECTION_STATUS.ACTIVE) {
      throw new BadRequestException('Integration connection is not active');
    }
    if (connection.provider !== INTEGRATION_PROVIDER.ZOHO_INVENTORY) {
      throw new BadRequestException('Connection is not a Zoho Inventory provider');
    }

    const factory = await this.inventoryRepository.findFactoryById(factoryId);
    if (!factory) {
      throw new NotFoundException(`Factory #${factoryId} not found`);
    }

    const syncRun = await this.integrationRepository.createSyncRun({
      connection_id: connectionId,
      factory_id: factoryId,
      direction: SYNC_DIRECTION.PULL,
      trigger: options?.trigger ?? SYNC_TRIGGER.MANUAL,
      status: SYNC_STATUS.RUNNING,
      items_processed: 0,
    });

    let addedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    let mappingCount = 0;
    const failures: ZohoPullItemFailure[] = [];

    try {
      const refreshed =
        await this.zohoOAuthService.refreshConnectionIfNeeded(connectionId);
      const accessToken = this.tokenCrypto.decrypt(refreshed.access_token!);
      const metadata = (refreshed.metadata ?? {}) as { api_domain?: string };
      const apiDomain =
        metadata.api_domain?.replace(/\/$/, '') ||
        process.env.ZOHO_INVENTORY_API_DOMAIN?.replace(/\/$/, '') ||
        'https://www.zohoapis.in';

      const items = await this.zohoInventoryClient.fetchAllItems(
        accessToken,
        apiDomain,
      );

      for (const item of items) {
        const outcome = await this.processItem(
          connectionId,
          factoryId,
          userId,
          syncRun.id,
          item,
        );
        switch (outcome.status) {
          case 'added':
            addedCount += 1;
            mappingCount += 1;
            break;
          case 'updated':
            updatedCount += 1;
            mappingCount += 1;
            break;
          case 'failed':
            failedCount += 1;
            failures.push({
              externalId: item.item_id,
              sku: item.sku,
              detail: outcome.detail,
            });
            break;
        }
      }

      const totalProcessed = items.length;
      const runStatus =
        failedCount === 0
          ? SYNC_STATUS.COMPLETED
          : totalProcessed === failedCount
            ? SYNC_STATUS.FAILED
            : SYNC_STATUS.PARTIAL;

      await this.integrationRepository.updateSyncRun(syncRun.id, factoryId, {
        status: runStatus,
        items_processed: totalProcessed,
        error_summary:
          failures.length > 0
            ? JSON.stringify(failures.slice(0, 50))
            : null,
        finished_at: new Date(),
      });

      if (runStatus === SYNC_STATUS.FAILED) {
        await this.syncFailedPublisher.publishPullSyncFailure({
          factoryId,
          connectionId,
          syncRunId: syncRun.id,
          provider: connection.provider,
          errorSummary:
            failures.length > 0
              ? failures[0].detail
              : 'All items failed during pull sync',
        });
      }

      return {
        addedCount,
        updatedCount,
        failedCount,
        mappingCount,
        syncRunId: syncRun.id,
        failures: failures.length ? failures : undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Zoho pull sync failed for connection #${connectionId}: ${msg}`);
      await this.integrationRepository.updateSyncRun(syncRun.id, factoryId, {
        status: SYNC_STATUS.FAILED,
        items_processed: addedCount + updatedCount + failedCount,
        error_summary: msg.slice(0, 2000),
        finished_at: new Date(),
      });
      await this.syncFailedPublisher.publishPullSyncFailure({
        factoryId,
        connectionId,
        syncRunId: syncRun.id,
        provider: connection.provider,
        errorSummary: msg,
      });
      throw err;
    }
  }

  private async processItem(
    connectionId: number,
    factoryId: number,
    userId: number,
    syncRunId: number,
    item: ZohoInventoryItemRecord,
  ): Promise<{ status: ItemOutcome; detail: string }> {
    let sku: string;
    try {
      sku = normalizeSku(item.sku);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'failed', detail: msg.slice(0, 200) };
    }

    let name: string;
    let unit: string;
    try {
      name = normalizeInventoryName(item.name, 'Item name');
      unit = normalizeUnit(item.unit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'failed', detail: msg.slice(0, 200) };
    }

    const categoryName = item.category_name?.trim();
    if (!categoryName) {
      return { status: 'failed', detail: 'Category name missing from Zoho item' };
    }

    const locationName = item.location_name?.trim();
    if (!locationName) {
      return { status: 'failed', detail: 'Location name missing from Zoho item' };
    }

    try {
      return await this.inventoryRepository.sequelize.transaction(
        async (transaction) => {
          const category = await this.inventoryRepository.findCategoryByName(
            factoryId,
            categoryName,
          );
          if (!category) {
            return {
              status: 'failed' as const,
              detail: `Category "${categoryName}" nahi mila`,
            };
          }

          const location = await this.inventoryRepository.findLocationByName(
            factoryId,
            locationName,
          );
          if (!location) {
            return {
              status: 'failed' as const,
              detail: `Location "${locationName}" nahi mila`,
            };
          }

          const mapping = await this.integrationRepository.findMapping(
            factoryId,
            { connectionId, externalId: item.item_id },
          );

          const qty = Number(item.available_stock);
          const hasStockIn = Number.isFinite(qty) && qty > 0;
          const reorderThreshold =
            item.reorder_level != null && Number.isFinite(item.reorder_level)
              ? formatQuantity(item.reorder_level)
              : null;

          if (mapping) {
            await this.inventoryRepository.itemModel.update(
              {
                name,
                category_id: category.id,
                location_id: location.id,
                unit,
                reorder_threshold: reorderThreshold,
              } as any,
              {
                where: { id: mapping.inventory_item_id, factory_id: factoryId },
                transaction,
              },
            );

            await this.integrationRepository.updateMapping(
              mapping.id,
              factoryId,
              {
                external_sku: sku,
                last_synced_at: new Date(),
                sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
              },
              transaction,
            );

            return {
              status: 'updated' as const,
              detail: 'metadata update',
            };
          }

          const created = await this.inventoryRepository.createItem(
            {
              factory_id: factoryId,
              category_id: category.id,
              location_id: location.id,
              sku,
              name,
              unit,
              current_quantity: formatQuantity(0),
              reorder_threshold: reorderThreshold,
              is_active: true,
            },
            transaction,
          );

          if (hasStockIn) {
            await this.recordZohoPullStockIn(
              factoryId,
              created.id,
              formatQuantity(qty),
              userId,
              syncRunId,
              transaction,
            );
          }

          await this.integrationRepository.createMapping(
            {
              connection_id: connectionId,
              factory_id: factoryId,
              external_id: item.item_id,
              external_sku: sku,
              inventory_item_id: created.id,
              last_synced_at: new Date(),
              sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
            },
            transaction,
          );

          return {
            status: 'added' as const,
            detail: hasStockIn ? 'item create + stock in' : 'item create (qty 0)',
          };
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'failed', detail: msg.slice(0, 200) };
    }
  }

  private async recordZohoPullStockIn(
    factoryId: number,
    inventoryItemId: number,
    quantity: string,
    userId: number,
    syncRunId: number,
    transaction: Transaction,
  ) {
    await this.transactionService.recordStockIn(
      {
        factory_id: factoryId,
        inventory_item_id: inventoryItemId,
        quantity,
        reference_type: INVENTORY_REFERENCE_TYPE.ZOHO_PULL,
        reference_id: syncRunId,
        created_by: userId,
        notes: 'Zoho inventory pull sync',
      },
      transaction,
    );
  }
}
