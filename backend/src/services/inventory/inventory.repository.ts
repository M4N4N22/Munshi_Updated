import { Injectable } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import {
  InventoryCategory,
  InventoryItem,
  InventoryLocation,
  InventoryTransaction,
} from './inventory.schema';
import { INVENTORY_PAGINATION } from './inventory.constants';

@Injectable()
export class InventoryRepository {
  readonly categoryModel: typeof InventoryCategory;
  readonly locationModel: typeof InventoryLocation;
  readonly itemModel: typeof InventoryItem;
  readonly transactionModel: typeof InventoryTransaction;

  constructor(private readonly dbService: DbService) {
    this.categoryModel = this.dbService.sqlService.InventoryCategory;
    this.locationModel = this.dbService.sqlService.InventoryLocation;
    this.itemModel = this.dbService.sqlService.InventoryItem;
    this.transactionModel = this.dbService.sqlService.InventoryTransaction;
  }

  get sequelize() {
    return this.itemModel.sequelize!;
  }

  async findFactoryById(factoryId: number) {
    return this.dbService.sqlService.Factory.findByPk(factoryId);
  }

  // ── Categories ──

  listCategories(factoryId: number, activeOnly = false) {
    return this.categoryModel.findAll({
      where: {
        factory_id: factoryId,
        ...(activeOnly ? { is_active: true } : {}),
      },
      order: [['name', 'ASC']],
    });
  }

  findCategoryById(id: number, factoryId: number) {
    return this.categoryModel.findOne({ where: { id, factory_id: factoryId } });
  }

  findCategoryByName(factoryId: number, name: string) {
    return this.categoryModel.findOne({
      where: {
        factory_id: factoryId,
        name: { [Op.iLike]: name },
      },
    });
  }

  createCategory(data: Record<string, unknown>, transaction?: Transaction) {
    return this.categoryModel.create(data as any, { transaction });
  }

  updateCategory(
    id: number,
    factoryId: number,
    patch: Record<string, unknown>,
  ) {
    return this.categoryModel.update(patch as any, {
      where: { id, factory_id: factoryId },
    });
  }

  // ── Locations ──

  listLocations(factoryId: number, activeOnly = false) {
    return this.locationModel.findAll({
      where: {
        factory_id: factoryId,
        ...(activeOnly ? { is_active: true } : {}),
      },
      order: [['name', 'ASC']],
    });
  }

  findLocationById(id: number, factoryId: number) {
    return this.locationModel.findOne({ where: { id, factory_id: factoryId } });
  }

  createLocation(data: Record<string, unknown>, transaction?: Transaction) {
    return this.locationModel.create(data as any, { transaction });
  }

  updateLocation(
    id: number,
    factoryId: number,
    patch: Record<string, unknown>,
  ) {
    return this.locationModel.update(patch as any, {
      where: { id, factory_id: factoryId },
    });
  }

  // ── Items ──

  listItems(
    factoryId: number,
    opts?: { page?: number; page_size?: number; activeOnly?: boolean },
  ) {
    const page = Math.max(1, opts?.page ?? INVENTORY_PAGINATION.DEFAULT_PAGE);
    const pageSize = Math.min(
      INVENTORY_PAGINATION.MAX_PAGE_SIZE,
      Math.max(1, opts?.page_size ?? INVENTORY_PAGINATION.DEFAULT_PAGE_SIZE),
    );

    return this.itemModel.findAndCountAll({
      where: {
        factory_id: factoryId,
        ...(opts?.activeOnly ? { is_active: true } : {}),
      },
      include: [
        {
          model: this.categoryModel,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: this.locationModel,
          as: 'location',
          attributes: ['id', 'name'],
        },
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['name', 'ASC']],
    });
  }

  findItemById(id: number, factoryId?: number, transaction?: Transaction) {
    const where = {
      id,
      ...(factoryId != null ? { factory_id: factoryId } : {}),
    };
    const includes = [
      {
        model: this.categoryModel,
        as: 'category',
        attributes: ['id', 'name'],
      },
      {
        model: this.locationModel,
        as: 'location',
        attributes: ['id', 'name'],
      },
    ];

    // PostgreSQL rejects FOR UPDATE on LEFT OUTER JOIN — lock inventory_items only.
    if (transaction) {
      return this.itemModel.findOne({
        where,
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
    }

    return this.itemModel.findOne({
      where,
      include: includes,
    });
  }

  findItemBySku(factoryId: number, sku: string) {
    return this.itemModel.findOne({
      where: { factory_id: factoryId, sku },
    });
  }

  findItemByName(factoryId: number, name: string) {
    return this.itemModel.findOne({
      where: {
        factory_id: factoryId,
        name: { [Op.iLike]: name.trim() },
        is_active: true,
      },
    });
  }

  findLocationByName(factoryId: number, name: string) {
    return this.locationModel.findOne({
      where: {
        factory_id: factoryId,
        name: { [Op.iLike]: name.trim() },
      },
    });
  }

  createItem(data: Record<string, unknown>, transaction?: Transaction) {
    return this.itemModel.create(data as any, { transaction });
  }

  updateItem(id: number, factoryId: number, patch: Record<string, unknown>) {
    return this.itemModel.update(patch as any, {
      where: { id, factory_id: factoryId },
    });
  }

  updateItemQuantity(
    id: number,
    factoryId: number,
    currentQuantity: string,
    transaction: Transaction,
  ) {
    return this.itemModel.update(
      { current_quantity: currentQuantity } as any,
      { where: { id, factory_id: factoryId }, transaction },
    );
  }

  // ── Transactions ──

  listTransactions(factoryId: number, itemId?: number) {
    return this.transactionModel.findAll({
      where: {
        factory_id: factoryId,
        ...(itemId != null ? { inventory_item_id: itemId } : {}),
      },
      order: [['id', 'DESC']],
    });
  }

  createTransaction(
    data: Record<string, unknown>,
    transaction: Transaction,
  ) {
    return this.transactionModel.create(data as any, { transaction });
  }

  sumTransactionQuantities(itemId: number, factoryId: number) {
    return this.transactionModel.findAll({
      where: { inventory_item_id: itemId, factory_id: factoryId },
      attributes: ['transaction_type', 'quantity'],
      raw: true,
    });
  }
}
