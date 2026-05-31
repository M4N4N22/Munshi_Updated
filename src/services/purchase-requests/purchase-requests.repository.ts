import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { Transaction, WhereOptions } from 'sequelize';
import {
  IPurchaseRequestCreateInput,
  IPurchaseRequestItemInput,
  IPurchaseRequestListOptions,
  IPurchaseRequestUpdateInput,
} from './purchase-requests.interfaces';
import {
  PurchaseRequest,
  PurchaseRequestAudit,
  PurchaseRequestItem,
} from './purchase-requests.schema';
import { PURCHASE_REQUEST_PAGINATION } from './purchase-requests.constants';

@Injectable()
export class PurchaseRequestRepository {
  readonly model: typeof PurchaseRequest;
  readonly itemModel: typeof PurchaseRequestItem;
  readonly auditModel: typeof PurchaseRequestAudit;

  constructor(private readonly dbService: DbService) {
    this.model = this.dbService.sqlService.PurchaseRequest;
    this.itemModel = this.dbService.sqlService.PurchaseRequestItem;
    this.auditModel = this.dbService.sqlService.PurchaseRequestAudit;
  }

  get sequelize() {
    return this.model.sequelize!;
  }

  async createWithItems(
    input: IPurchaseRequestCreateInput,
    status: string,
    transaction?: Transaction,
  ): Promise<PurchaseRequest> {
    const pr = await this.model.create(
      {
        factory_id: input.factory_id,
        title: input.title,
        description: input.description ?? null,
        status,
        requested_by: input.requested_by,
        priority: input.priority ?? 'NORMAL',
        notes: input.notes ?? null,
        requested_at: status === 'PENDING_APPROVAL' ? new Date() : null,
      } as any,
      { transaction },
    );

    if (input.items?.length) {
      await this.replaceItems(pr.id, input.items, transaction);
    }

    return pr;
  }

  async replaceItems(
    purchaseRequestId: number,
    items: IPurchaseRequestItemInput[],
    transaction?: Transaction,
  ): Promise<void> {
    await this.itemModel.destroy({
      where: { purchase_request_id: purchaseRequestId },
      transaction,
    });
    if (!items.length) return;
    await this.itemModel.bulkCreate(
      items.map((item) => ({
        purchase_request_id: purchaseRequestId,
        inventory_item_id: item.inventory_item_id ?? null,
        item_name: item.item_name,
        requested_quantity: item.requested_quantity,
        unit: item.unit ?? 'pcs',
        notes: item.notes ?? null,
      })) as any[],
      { transaction },
    );
  }

  async findById(
    id: number,
    factoryId: number,
    includeItems = true,
  ): Promise<PurchaseRequest | null> {
    return this.model.findOne({
      where: { id, factory_id: factoryId },
      include: includeItems
        ? [{ model: this.itemModel, as: 'items' }]
        : undefined,
    });
  }

  async listByFactory(
    factoryId: number,
    options: IPurchaseRequestListOptions = {},
  ): Promise<{ rows: PurchaseRequest[]; count: number }> {
    const page = Math.max(
      1,
      options.page ?? PURCHASE_REQUEST_PAGINATION.DEFAULT_PAGE,
    );
    const limit = Math.min(
      PURCHASE_REQUEST_PAGINATION.MAX_LIMIT,
      Math.max(1, options.limit ?? PURCHASE_REQUEST_PAGINATION.DEFAULT_LIMIT),
    );
    const where: WhereOptions = { factory_id: factoryId };
    if (options.status) {
      (where as any).status = options.status;
    }
    return this.model.findAndCountAll({
      where,
      include: [{ model: this.itemModel, as: 'items' }],
      order: [['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
  }

  async updateRow(
    row: PurchaseRequest,
    patch: Record<string, unknown>,
    transaction?: Transaction,
  ): Promise<PurchaseRequest> {
    await row.update(patch as any, { transaction });
    return row;
  }

  async setRequestNumber(
    id: number,
    requestNumber: string,
    transaction?: Transaction,
  ): Promise<void> {
    await this.model.update(
      { request_number: requestNumber } as any,
      { where: { id }, transaction },
    );
  }

  async appendAudit(
    purchaseRequestId: number,
    eventType: string,
    performedBy: number | null,
    metadata: Record<string, unknown> = {},
    transaction?: Transaction,
  ): Promise<PurchaseRequestAudit> {
    return this.auditModel.create(
      {
        purchase_request_id: purchaseRequestId,
        event_type: eventType,
        performed_by: performedBy,
        metadata,
      } as any,
      { transaction },
    );
  }

  async listAudit(purchaseRequestId: number): Promise<PurchaseRequestAudit[]> {
    return this.auditModel.findAll({
      where: { purchase_request_id: purchaseRequestId },
      order: [['id', 'ASC']],
    });
  }
}
