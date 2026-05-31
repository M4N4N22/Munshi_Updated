import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VendorService } from 'src/services/vendors/vendors.service';
import {
  PURCHASE_REQUEST_AUDIT_EVENT,
  PURCHASE_REQUEST_PRIORITY,
  PURCHASE_REQUEST_STATUS,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from './purchase-requests.constants';
import {
  IPurchaseRequestAuditRecord,
  IPurchaseRequestCreateInput,
  IPurchaseRequestItemInput,
  IPurchaseRequestListOptions,
  IPurchaseRequestRecord,
  IPurchaseRequestUpdateInput,
} from './purchase-requests.interfaces';
import { PurchaseRequestRepository } from './purchase-requests.repository';
import {
  PurchaseRequestValidationService,
  assertFactoryId,
  buildRequestNumber,
  normalizeQuantity,
} from './purchase-requests.validation';
import {
  PurchaseRequest,
  PurchaseRequestItem,
} from './purchase-requests.schema';

@Injectable()
export class PurchaseRequestService {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly validationService: PurchaseRequestValidationService,
    private readonly vendorService: VendorService,
  ) {}

  async listPurchaseRequests(
    factoryId: number,
    options: IPurchaseRequestListOptions = {},
  ): Promise<{ data: IPurchaseRequestRecord[]; total: number; page: number; limit: number }> {
    assertFactoryId(factoryId);
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;
    const { rows, count } =
      await this.purchaseRequestRepository.listByFactory(factoryId, {
        ...options,
        page,
        limit,
      });
    return {
      data: rows.map((row) => this.toRecord(row)),
      total: count,
      page,
      limit,
    };
  }

  async getPurchaseRequest(
    id: number,
    factoryId: number,
  ): Promise<IPurchaseRequestRecord> {
    assertFactoryId(factoryId);
    const row = await this.purchaseRequestRepository.findById(id, factoryId);
    if (!row) {
      throw new NotFoundException(
        `Purchase request #${id} not found in factory #${factoryId}`,
      );
    }
    return this.toRecord(row);
  }

  async createPurchaseRequest(
    input: IPurchaseRequestCreateInput,
  ): Promise<IPurchaseRequestRecord> {
    await this.validationService.assertFactoryMember(
      input.factory_id,
      input.requested_by,
    );
    const status = input.submit
      ? PURCHASE_REQUEST_STATUS.PENDING_APPROVAL
      : PURCHASE_REQUEST_STATUS.DRAFT;
    const normalizedItems = this.normalizeItems(input.items);

    const sequelize = this.purchaseRequestRepository.sequelize;
    return sequelize.transaction(async (transaction) => {
      const row = await this.purchaseRequestRepository.createWithItems(
        { ...input, items: normalizedItems },
        status,
        transaction,
      );
      const requestNumber = buildRequestNumber(input.factory_id, row.id);
      await this.purchaseRequestRepository.setRequestNumber(
        row.id,
        requestNumber,
        transaction,
      );
      await this.purchaseRequestRepository.appendAudit(
        row.id,
        PURCHASE_REQUEST_AUDIT_EVENT.CREATED,
        input.requested_by,
        { status, request_number: requestNumber },
        transaction,
      );
      if (input.submit) {
        await this.purchaseRequestRepository.appendAudit(
          row.id,
          PURCHASE_REQUEST_AUDIT_EVENT.SUBMITTED,
          input.requested_by,
          {},
          transaction,
        );
      }
      const full = await this.purchaseRequestRepository.findById(
        row.id,
        input.factory_id,
      );
      return this.toRecord(full!);
    });
  }

  async updatePurchaseRequest(
    id: number,
    input: IPurchaseRequestUpdateInput & {
      factory_id: number;
      performed_by: number;
    },
  ): Promise<IPurchaseRequestRecord> {
    await this.validationService.assertFactoryMember(
      input.factory_id,
      input.performed_by,
    );
    const row = await this.requireRow(id, input.factory_id);
    if (
      row.status !== PURCHASE_REQUEST_STATUS.DRAFT &&
      row.status !== PURCHASE_REQUEST_STATUS.PENDING_APPROVAL
    ) {
      throw new BadRequestException(
        'Only draft or pending approval requests can be updated',
      );
    }

    const sequelize = this.purchaseRequestRepository.sequelize;
    return sequelize.transaction(async (transaction) => {
      const patch: Record<string, unknown> = {};
      if (input.title != null) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.priority != null) patch.priority = input.priority;
      if (input.notes !== undefined) patch.notes = input.notes;
      await this.purchaseRequestRepository.updateRow(row, patch, transaction);
      if (input.items) {
        await this.purchaseRequestRepository.replaceItems(
          id,
          this.normalizeItems(input.items),
          transaction,
        );
      }
      await this.purchaseRequestRepository.appendAudit(
        id,
        PURCHASE_REQUEST_AUDIT_EVENT.UPDATED,
        input.performed_by,
        patch,
        transaction,
      );
      const full = await this.purchaseRequestRepository.findById(
        id,
        input.factory_id,
      );
      return this.toRecord(full!);
    });
  }

  async approvePurchaseRequest(
    id: number,
    factoryId: number,
    performedBy: number,
    remarks?: string,
  ): Promise<IPurchaseRequestRecord> {
    await this.validationService.assertCanApprove(factoryId, performedBy);
    const row = await this.requireRow(id, factoryId);
    this.validationService.assertStatusTransition(
      row.status as PurchaseRequestStatus,
      PURCHASE_REQUEST_STATUS.APPROVED,
    );

    const sequelize = this.purchaseRequestRepository.sequelize;
    return sequelize.transaction(async (transaction) => {
      await this.purchaseRequestRepository.updateRow(
        row,
        {
          status: PURCHASE_REQUEST_STATUS.APPROVED,
          approved_by: performedBy,
          approved_at: new Date(),
        },
        transaction,
      );
      await this.purchaseRequestRepository.appendAudit(
        id,
        PURCHASE_REQUEST_AUDIT_EVENT.APPROVED,
        performedBy,
        { remarks: remarks ?? null },
        transaction,
      );
      const full = await this.purchaseRequestRepository.findById(id, factoryId);
      return this.toRecord(full!);
    });
  }

  async rejectPurchaseRequest(
    id: number,
    factoryId: number,
    performedBy: number,
    remarks?: string,
  ): Promise<IPurchaseRequestRecord> {
    await this.validationService.assertCanApprove(factoryId, performedBy);
    const row = await this.requireRow(id, factoryId);
    this.validationService.assertStatusTransition(
      row.status as PurchaseRequestStatus,
      PURCHASE_REQUEST_STATUS.REJECTED,
    );

    const sequelize = this.purchaseRequestRepository.sequelize;
    return sequelize.transaction(async (transaction) => {
      await this.purchaseRequestRepository.updateRow(
        row,
        { status: PURCHASE_REQUEST_STATUS.REJECTED },
        transaction,
      );
      await this.purchaseRequestRepository.appendAudit(
        id,
        PURCHASE_REQUEST_AUDIT_EVENT.REJECTED,
        performedBy,
        { remarks: remarks ?? null },
        transaction,
      );
      const full = await this.purchaseRequestRepository.findById(id, factoryId);
      return this.toRecord(full!);
    });
  }

  async assignVendor(
    id: number,
    factoryId: number,
    vendorId: number,
    performedBy: number,
  ): Promise<IPurchaseRequestRecord> {
    await this.validationService.assertCanApprove(factoryId, performedBy);
    const row = await this.requireRow(id, factoryId);
    if (
      row.status !== PURCHASE_REQUEST_STATUS.APPROVED &&
      row.status !== PURCHASE_REQUEST_STATUS.ASSIGNED_TO_VENDOR
    ) {
      throw new BadRequestException(
        'Vendor can only be assigned to approved purchase requests',
      );
    }
    await this.vendorService.getVendor(vendorId, factoryId);

    const eventType =
      row.assigned_vendor_id != null
        ? PURCHASE_REQUEST_AUDIT_EVENT.VENDOR_CHANGED
        : PURCHASE_REQUEST_AUDIT_EVENT.VENDOR_ASSIGNED;

    const sequelize = this.purchaseRequestRepository.sequelize;
    return sequelize.transaction(async (transaction) => {
      await this.purchaseRequestRepository.updateRow(
        row,
        {
          assigned_vendor_id: vendorId,
          status: PURCHASE_REQUEST_STATUS.ASSIGNED_TO_VENDOR,
        },
        transaction,
      );
      await this.purchaseRequestRepository.appendAudit(
        id,
        eventType,
        performedBy,
        {
          vendor_id: vendorId,
          previous_vendor_id: row.assigned_vendor_id ?? null,
        },
        transaction,
      );
      const full = await this.purchaseRequestRepository.findById(id, factoryId);
      return this.toRecord(full!);
    });
  }

  async removeVendor(
    id: number,
    factoryId: number,
    performedBy: number,
  ): Promise<IPurchaseRequestRecord> {
    await this.validationService.assertCanApprove(factoryId, performedBy);
    const row = await this.requireRow(id, factoryId);
    if (!row.assigned_vendor_id) {
      throw new BadRequestException('No vendor assigned on this request');
    }

    const sequelize = this.purchaseRequestRepository.sequelize;
    return sequelize.transaction(async (transaction) => {
      await this.purchaseRequestRepository.updateRow(
        row,
        {
          assigned_vendor_id: null,
          status: PURCHASE_REQUEST_STATUS.APPROVED,
        },
        transaction,
      );
      await this.purchaseRequestRepository.appendAudit(
        id,
        PURCHASE_REQUEST_AUDIT_EVENT.VENDOR_REMOVED,
        performedBy,
        { previous_vendor_id: row.assigned_vendor_id },
        transaction,
      );
      const full = await this.purchaseRequestRepository.findById(id, factoryId);
      return this.toRecord(full!);
    });
  }

  async closePurchaseRequest(
    id: number,
    factoryId: number,
    performedBy: number,
  ): Promise<IPurchaseRequestRecord> {
    await this.validationService.assertCanApprove(factoryId, performedBy);
    const row = await this.requireRow(id, factoryId);
    this.validationService.assertStatusTransition(
      row.status as PurchaseRequestStatus,
      PURCHASE_REQUEST_STATUS.CLOSED,
    );

    const sequelize = this.purchaseRequestRepository.sequelize;
    return sequelize.transaction(async (transaction) => {
      await this.purchaseRequestRepository.updateRow(
        row,
        {
          status: PURCHASE_REQUEST_STATUS.CLOSED,
          closed_at: new Date(),
        },
        transaction,
      );
      await this.purchaseRequestRepository.appendAudit(
        id,
        PURCHASE_REQUEST_AUDIT_EVENT.CLOSED,
        performedBy,
        {},
        transaction,
      );
      const full = await this.purchaseRequestRepository.findById(id, factoryId);
      return this.toRecord(full!);
    });
  }

  async listAudit(
    id: number,
    factoryId: number,
  ): Promise<IPurchaseRequestAuditRecord[]> {
    await this.getPurchaseRequest(id, factoryId);
    const rows = await this.purchaseRequestRepository.listAudit(id);
    return rows.map((row) => ({
      id: row.id,
      purchase_request_id: row.purchase_request_id,
      event_type: row.event_type,
      performed_by: row.performed_by ?? null,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      created_at: row.created_at!,
    }));
  }

  /** Used by workflow handler after collecting session data. */
  async createFromWorkflowSession(params: {
    factoryId: number;
    requestedBy: number;
    title: string;
    description?: string | null;
    items: IPurchaseRequestItemInput[];
    submit?: boolean;
  }): Promise<IPurchaseRequestRecord> {
    return this.createPurchaseRequest({
      factory_id: params.factoryId,
      requested_by: params.requestedBy,
      title: params.title,
      description: params.description,
      items: params.items,
      submit: params.submit ?? true,
    });
  }

  private normalizeItems(items?: IPurchaseRequestItemInput[]) {
    if (!items?.length) return [];
    return items.map((item) => ({
      ...item,
      requested_quantity: normalizeQuantity(item.requested_quantity),
      unit: item.unit?.trim() || 'pcs',
    }));
  }

  private async requireRow(id: number, factoryId: number): Promise<PurchaseRequest> {
    const row = await this.purchaseRequestRepository.findById(id, factoryId, false);
    if (!row) {
      throw new NotFoundException(
        `Purchase request #${id} not found in factory #${factoryId}`,
      );
    }
    return row;
  }

  private toRecord(row: PurchaseRequest): IPurchaseRequestRecord {
    const items = (row as any).items as PurchaseRequestItem[] | undefined;
    return {
      id: row.id,
      factory_id: row.factory_id,
      request_number: row.request_number ?? null,
      title: row.title,
      description: row.description ?? null,
      status: row.status as PurchaseRequestStatus,
      requested_by: row.requested_by,
      approved_by: row.approved_by ?? null,
      assigned_vendor_id: row.assigned_vendor_id ?? null,
      priority: (row.priority ?? PURCHASE_REQUEST_PRIORITY.NORMAL) as PurchaseRequestPriority,
      requested_at: row.requested_at ?? null,
      approved_at: row.approved_at ?? null,
      closed_at: row.closed_at ?? null,
      notes: row.notes ?? null,
      created_at: row.createdAt!,
      updated_at: row.updatedAt!,
      items: items?.map((item) => ({
        id: item.id,
        purchase_request_id: item.purchase_request_id,
        inventory_item_id: item.inventory_item_id ?? null,
        item_name: item.item_name,
        requested_quantity: String(item.requested_quantity),
        unit: item.unit,
        notes: item.notes ?? null,
      })),
    };
  }
}
