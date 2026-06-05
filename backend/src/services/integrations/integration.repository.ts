import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import {
  IntegrationConnection,
  IntegrationItemMapping,
  IntegrationPushDelivery,
  IntegrationSyncRun,
} from './integration.schema';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  PUSH_DELIVERY_STATUS,
  SYNC_DIRECTION,
  SYNC_STATUS,
} from './integration.constants';

@Injectable()
export class IntegrationRepository {
  readonly connectionModel: typeof IntegrationConnection;
  readonly mappingModel: typeof IntegrationItemMapping;
  readonly syncRunModel: typeof IntegrationSyncRun;
  readonly pushDeliveryModel: typeof IntegrationPushDelivery;

  constructor(private readonly dbService: DbService) {
    this.connectionModel = this.dbService.sqlService.IntegrationConnection;
    this.mappingModel = this.dbService.sqlService.IntegrationItemMapping;
    this.syncRunModel = this.dbService.sqlService.IntegrationSyncRun;
    this.pushDeliveryModel = this.dbService.sqlService.IntegrationPushDelivery;
  }

  get sequelize() {
    return this.connectionModel.sequelize!;
  }

  createConnection(
    data: {
      factory_id: number;
      provider: string;
      status?: string;
      access_token?: string | null;
      refresh_token?: string | null;
      expires_at?: Date | null;
      metadata?: object;
    },
    transaction?: Transaction,
  ) {
    return this.connectionModel.create(data as any, { transaction });
  }

  getConnection(id: number, factoryId: number) {
    return this.connectionModel.findOne({
      where: { id, factory_id: factoryId },
    });
  }

  getConnectionById(id: number) {
    return this.connectionModel.findByPk(id);
  }

  findActiveConnectionByProvider(factoryId: number, provider: string) {
    return this.connectionModel.findOne({
      where: {
        factory_id: factoryId,
        provider,
        status: 'active',
      },
    });
  }

  async updateConnection(
    id: number,
    factoryId: number,
    patch: {
      status?: string;
      access_token?: string | null;
      refresh_token?: string | null;
      expires_at?: Date | null;
      metadata?: object;
    },
    transaction?: Transaction,
  ) {
    const [count] = await this.connectionModel.update(patch as any, {
      where: { id, factory_id: factoryId },
      transaction,
    });
    if (count === 0) {
      return null;
    }
    return this.connectionModel.findOne({
      where: { id, factory_id: factoryId },
      transaction,
    });
  }

  listConnectionsByFactory(factoryId: number) {
    return this.connectionModel.findAll({
      where: { factory_id: factoryId },
      order: [['created_at', 'DESC']],
    });
  }

  listActiveZohoInventoryConnections() {
    return this.connectionModel.findAll({
      where: {
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      },
      order: [
        ['factory_id', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  findRunningPullSyncRun(connectionId: number, factoryId: number) {
    return this.syncRunModel.findOne({
      where: {
        connection_id: connectionId,
        factory_id: factoryId,
        direction: SYNC_DIRECTION.PULL,
        status: SYNC_STATUS.RUNNING,
      },
    });
  }

  getLatestPullSyncRun(
    connectionId: number,
    factoryId: number,
    trigger?: string,
  ) {
    return this.syncRunModel.findOne({
      where: {
        connection_id: connectionId,
        factory_id: factoryId,
        direction: SYNC_DIRECTION.PULL,
        ...(trigger ? { trigger } : {}),
      },
      order: [['started_at', 'DESC']],
    });
  }

  getLatestSuccessfulPullSyncRun(connectionId: number, factoryId: number) {
    return this.syncRunModel.findOne({
      where: {
        connection_id: connectionId,
        factory_id: factoryId,
        direction: SYNC_DIRECTION.PULL,
        status: {
          [Op.in]: [SYNC_STATUS.COMPLETED, SYNC_STATUS.PARTIAL],
        },
      },
      order: [['finished_at', 'DESC']],
    });
  }

  createMapping(
    data: {
      connection_id: number;
      factory_id: number;
      external_id: string;
      external_sku?: string | null;
      inventory_item_id: number;
      last_synced_at?: Date | null;
      sync_status?: string;
    },
    transaction?: Transaction,
  ) {
    return this.mappingModel.create(data as any, { transaction });
  }

  findMapping(
    factoryId: number,
    criteria: {
      connectionId: number;
      externalId?: string;
      inventoryItemId?: number;
    },
  ) {
    const where: Record<string, unknown> = {
      factory_id: factoryId,
      connection_id: criteria.connectionId,
    };
    if (criteria.externalId !== undefined) {
      where.external_id = criteria.externalId;
    }
    if (criteria.inventoryItemId !== undefined) {
      where.inventory_item_id = criteria.inventoryItemId;
    }
    return this.mappingModel.findOne({ where: where as any });
  }

  async updateMapping(
    id: number,
    factoryId: number,
    patch: {
      external_sku?: string | null;
      last_synced_at?: Date | null;
      sync_status?: string;
    },
    transaction?: Transaction,
  ) {
    const [count] = await this.mappingModel.update(patch as any, {
      where: { id, factory_id: factoryId },
      transaction,
    });
    if (count === 0) {
      return null;
    }
    return this.mappingModel.findOne({
      where: { id, factory_id: factoryId },
      transaction,
    });
  }

  createSyncRun(
    data: {
      connection_id: number;
      factory_id: number;
      direction: string;
      trigger: string;
      status?: string;
      items_processed?: number;
      error_summary?: string | null;
      started_at?: Date;
      finished_at?: Date | null;
    },
    transaction?: Transaction,
  ) {
    return this.syncRunModel.create(data as any, { transaction });
  }

  async updateSyncRun(
    id: number,
    factoryId: number,
    patch: {
      status?: string;
      items_processed?: number;
      error_summary?: string | null;
      finished_at?: Date | null;
    },
    transaction?: Transaction,
  ) {
    const [count] = await this.syncRunModel.update(patch as any, {
      where: { id, factory_id: factoryId },
      transaction,
    });
    if (count === 0) {
      return null;
    }
    return this.syncRunModel.findOne({
      where: { id, factory_id: factoryId },
      transaction,
    });
  }

  findDelivery(
    factoryId: number,
    connectionId: number,
    inventoryTransactionId: number,
    transaction?: Transaction,
  ) {
    return this.pushDeliveryModel.findOne({
      where: {
        factory_id: factoryId,
        connection_id: connectionId,
        inventory_transaction_id: inventoryTransactionId,
      },
      transaction,
    });
  }

  createDelivery(
    data: {
      connection_id: number;
      factory_id: number;
      inventory_transaction_id: number;
      status?: string;
      zoho_reference?: string | null;
      last_error?: string | null;
      delivered_at?: Date | null;
    },
    transaction?: Transaction,
  ) {
    return this.pushDeliveryModel.create(
      {
        status: PUSH_DELIVERY_STATUS.PENDING,
        ...data,
      } as any,
      { transaction },
    );
  }

  async markDelivered(
    id: number,
    factoryId: number,
    zohoReference?: string | null,
    transaction?: Transaction,
  ) {
    const [count] = await this.pushDeliveryModel.update(
      {
        status: PUSH_DELIVERY_STATUS.DELIVERED,
        zoho_reference: zohoReference ?? null,
        last_error: null,
        delivered_at: new Date(),
      } as any,
      {
        where: { id, factory_id: factoryId },
        transaction,
      },
    );
    if (count === 0) {
      return null;
    }
    return this.pushDeliveryModel.findOne({
      where: { id, factory_id: factoryId },
      transaction,
    });
  }

  async markFailed(
    id: number,
    factoryId: number,
    lastError: string,
    transaction?: Transaction,
  ) {
    const [count] = await this.pushDeliveryModel.update(
      {
        status: PUSH_DELIVERY_STATUS.FAILED,
        last_error: lastError.slice(0, 2000),
      } as any,
      {
        where: { id, factory_id: factoryId },
        transaction,
      },
    );
    if (count === 0) {
      return null;
    }
    return this.pushDeliveryModel.findOne({
      where: { id, factory_id: factoryId },
      transaction,
    });
  }

  listDeliveries(
    factoryId: number,
    criteria?: {
      connectionId?: number;
      inventoryTransactionId?: number;
      status?: string;
    },
  ) {
    const where: Record<string, unknown> = { factory_id: factoryId };
    if (criteria?.connectionId !== undefined) {
      where.connection_id = criteria.connectionId;
    }
    if (criteria?.inventoryTransactionId !== undefined) {
      where.inventory_transaction_id = criteria.inventoryTransactionId;
    }
    if (criteria?.status !== undefined) {
      where.status = criteria.status;
    }
    return this.pushDeliveryModel.findAll({
      where: where as any,
      order: [['created_at', 'DESC']],
    });
  }
}
