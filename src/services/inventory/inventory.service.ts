import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateInventoryCategoryDto,
  CreateInventoryItemDto,
  CreateInventoryLocationDto,
  UpdateInventoryCategoryDto,
  UpdateInventoryItemDto,
  UpdateInventoryLocationDto,
} from './inventory.dto';
import { INVENTORY_PAGINATION } from './inventory.constants';
import {
  IInventoryCategoryRecord,
  IInventoryItemRecord,
  IInventoryListResult,
  IInventoryLocationRecord,
  IInventoryStatusRecord,
  IInventoryTransactionRecord,
} from './inventory.interfaces';
import { InventoryRepository } from './inventory.repository';
import { InventoryTransactionService } from './inventory-transaction.service';
import {
  assertFactoryId,
  formatQuantity,
  normalizeInventoryName,
  normalizeOptionalText,
  normalizeSku,
  normalizeUnit,
  parseNonNegativeThreshold,
} from './inventory.validation';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly transactionService: InventoryTransactionService,
  ) {}

  // ── Categories ──

  async listCategories(
    factoryId: number,
    activeOnly = false,
  ): Promise<IInventoryCategoryRecord[]> {
    assertFactoryId(factoryId);
    const rows = await this.repository.listCategories(factoryId, activeOnly);
    return rows.map((r) => this.toCategoryRecord(r));
  }

  async createCategory(
    dto: CreateInventoryCategoryDto,
  ): Promise<IInventoryCategoryRecord> {
    assertFactoryId(dto.factory_id);
    await this.assertFactoryExists(dto.factory_id);

    const name = normalizeInventoryName(dto.name, 'Category name');
    const existing = await this.repository.findCategoryByName(
      dto.factory_id,
      name,
    );
    if (existing) {
      throw new ConflictException(
        `Category "${name}" already exists in this factory`,
      );
    }

    const row = await this.repository.createCategory({
      factory_id: dto.factory_id,
      name,
      description: normalizeOptionalText(
        dto.description,
        2000,
        'Description',
      ),
      is_active: dto.is_active ?? true,
    });
    return this.toCategoryRecord(row);
  }

  async updateCategory(
    id: number,
    factoryId: number,
    dto: UpdateInventoryCategoryDto,
  ): Promise<IInventoryCategoryRecord> {
    assertFactoryId(factoryId);
    const row = await this.repository.findCategoryById(id, factoryId);
    if (!row) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      patch.name = normalizeInventoryName(dto.name, 'Category name');
    }
    if (dto.description !== undefined) {
      patch.description = normalizeOptionalText(
        dto.description,
        2000,
        'Description',
      );
    }
    if (dto.is_active !== undefined) {
      patch.is_active = dto.is_active;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    if (patch.name) {
      const dup = await this.repository.findCategoryByName(
        factoryId,
        patch.name as string,
      );
      if (dup && dup.id !== id) {
        throw new ConflictException('Category name already used in this factory');
      }
    }

    await this.repository.updateCategory(id, factoryId, patch);
    const updated = await this.repository.findCategoryById(id, factoryId);
    return this.toCategoryRecord(updated!);
  }

  async deactivateCategory(
    id: number,
    factoryId: number,
  ): Promise<IInventoryCategoryRecord> {
    return this.updateCategory(id, factoryId, { is_active: false });
  }

  // ── Locations ──

  async listLocations(
    factoryId: number,
    activeOnly = false,
  ): Promise<IInventoryLocationRecord[]> {
    assertFactoryId(factoryId);
    const rows = await this.repository.listLocations(factoryId, activeOnly);
    return rows.map((r) => this.toLocationRecord(r));
  }

  async createLocation(
    dto: CreateInventoryLocationDto,
  ): Promise<IInventoryLocationRecord> {
    assertFactoryId(dto.factory_id);
    await this.assertFactoryExists(dto.factory_id);

    const name = normalizeInventoryName(dto.name, 'Location name');
    const rows = await this.repository.listLocations(dto.factory_id);
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      throw new ConflictException(
        `Location "${name}" already exists in this factory`,
      );
    }

    const row = await this.repository.createLocation({
      factory_id: dto.factory_id,
      name,
      code: normalizeOptionalText(dto.code, 64, 'Code'),
      address: normalizeOptionalText(dto.address, 2000, 'Address'),
      is_active: dto.is_active ?? true,
    });
    return this.toLocationRecord(row);
  }

  async updateLocation(
    id: number,
    factoryId: number,
    dto: UpdateInventoryLocationDto,
  ): Promise<IInventoryLocationRecord> {
    assertFactoryId(factoryId);
    const row = await this.repository.findLocationById(id, factoryId);
    if (!row) {
      throw new NotFoundException(`Location #${id} not found`);
    }

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      patch.name = normalizeInventoryName(dto.name, 'Location name');
    }
    if (dto.code !== undefined) {
      patch.code = normalizeOptionalText(dto.code, 64, 'Code');
    }
    if (dto.address !== undefined) {
      patch.address = normalizeOptionalText(dto.address, 2000, 'Address');
    }
    if (dto.is_active !== undefined) {
      patch.is_active = dto.is_active;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    await this.repository.updateLocation(id, factoryId, patch);
    const updated = await this.repository.findLocationById(id, factoryId);
    return this.toLocationRecord(updated!);
  }

  async deactivateLocation(
    id: number,
    factoryId: number,
  ): Promise<IInventoryLocationRecord> {
    return this.updateLocation(id, factoryId, { is_active: false });
  }

  // ── Items ──

  async listItems(
    factoryId: number,
    opts?: { page?: number; page_size?: number; activeOnly?: boolean },
  ): Promise<IInventoryListResult<IInventoryItemRecord>> {
    assertFactoryId(factoryId);
    const page = opts?.page ?? INVENTORY_PAGINATION.DEFAULT_PAGE;
    const pageSize = opts?.page_size ?? INVENTORY_PAGINATION.DEFAULT_PAGE_SIZE;
    const { rows, count } = await this.repository.listItems(factoryId, opts);
    return {
      data: rows.map((r) => this.toItemRecord(r)),
      meta: { total: count, page, page_size: pageSize },
    };
  }

  async findItem(id: number, factoryId: number): Promise<IInventoryItemRecord> {
    assertFactoryId(factoryId);
    const row = await this.repository.findItemById(id, factoryId);
    if (!row) {
      throw new NotFoundException(
        `Inventory item #${id} not found in factory #${factoryId}`,
      );
    }
    return this.toItemRecord(row);
  }

  async findItemBySku(
    factoryId: number,
    sku: string,
  ): Promise<IInventoryItemRecord> {
    assertFactoryId(factoryId);
    const normalizedSku = normalizeSku(sku);
    const row = await this.repository.findItemBySku(factoryId, normalizedSku);
    if (!row) {
      throw new NotFoundException(
        `No inventory item with SKU "${normalizedSku}" in factory #${factoryId}`,
      );
    }
    return this.findItem(row.id, factoryId);
  }

  async createItem(dto: CreateInventoryItemDto): Promise<IInventoryItemRecord> {
    assertFactoryId(dto.factory_id);
    await this.assertFactoryExists(dto.factory_id);

    if (dto.category_id == null) {
      throw new BadRequestException('category_id is required');
    }
    if (dto.location_id == null) {
      throw new BadRequestException('location_id is required');
    }

    await this.assertCategoryExists(dto.category_id, dto.factory_id);
    await this.assertLocationExists(dto.location_id, dto.factory_id);

    const sku = normalizeSku(dto.sku);
    const existingSku = await this.repository.findItemBySku(dto.factory_id, sku);
    if (existingSku) {
      throw new ConflictException(
        `SKU "${sku}" already exists in factory #${dto.factory_id}`,
      );
    }

    const row = await this.repository.createItem({
      factory_id: dto.factory_id,
      category_id: dto.category_id,
      location_id: dto.location_id,
      sku,
      name: normalizeInventoryName(dto.name, 'Item name'),
      unit: normalizeUnit(dto.unit),
      current_quantity: formatQuantity(0),
      reorder_threshold:
        dto.reorder_threshold != null
          ? formatQuantity(parseNonNegativeThreshold(dto.reorder_threshold)!)
          : null,
      is_active: dto.is_active ?? true,
    });

    return this.toItemRecord(row);
  }

  async updateItem(
    id: number,
    factoryId: number,
    dto: UpdateInventoryItemDto,
  ): Promise<IInventoryItemRecord> {
    assertFactoryId(factoryId);
    const existing = await this.repository.findItemById(id, factoryId);
    if (!existing) {
      throw new NotFoundException(`Inventory item #${id} not found`);
    }

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      patch.name = normalizeInventoryName(dto.name, 'Item name');
    }
    if (dto.unit !== undefined) {
      patch.unit = normalizeUnit(dto.unit);
    }
    if (dto.category_id !== undefined) {
      await this.assertCategoryExists(dto.category_id, factoryId);
      patch.category_id = dto.category_id;
    }
    if (dto.location_id !== undefined) {
      await this.assertLocationExists(dto.location_id, factoryId);
      patch.location_id = dto.location_id;
    }
    if (dto.reorder_threshold !== undefined) {
      patch.reorder_threshold =
        dto.reorder_threshold == null || String(dto.reorder_threshold).trim() === ''
          ? null
          : formatQuantity(parseNonNegativeThreshold(dto.reorder_threshold)!);
    }
    if (dto.is_active !== undefined) {
      patch.is_active = dto.is_active;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    await this.repository.updateItem(id, factoryId, patch);
    return this.findItem(id, factoryId);
  }

  async deactivateItem(
    id: number,
    factoryId: number,
  ): Promise<IInventoryItemRecord> {
    return this.updateItem(id, factoryId, { is_active: false });
  }

  // ── Quantity & status ──

  async getCurrentQuantity(itemId: number, factoryId: number): Promise<string> {
    const item = await this.findItem(itemId, factoryId);
    return item.current_quantity;
  }

  isLowStock(item: Pick<IInventoryItemRecord, 'current_quantity' | 'reorder_threshold'>): boolean {
    if (item.reorder_threshold == null || item.reorder_threshold === '') {
      return false;
    }
    return Number(item.current_quantity) < Number(item.reorder_threshold);
  }

  async getInventoryStatus(
    itemId: number,
    factoryId: number,
  ): Promise<IInventoryStatusRecord> {
    const item = await this.findItem(itemId, factoryId);
    return this.buildStatusRecord(item);
  }

  async getInventoryStatusBySku(
    factoryId: number,
    sku: string,
  ): Promise<IInventoryStatusRecord> {
    const item = await this.findItemBySku(factoryId, sku);
    return this.buildStatusRecord(item);
  }

  async listLowStockItems(factoryId: number): Promise<IInventoryStatusRecord[]> {
    const { data } = await this.listItems(factoryId, {
      activeOnly: true,
      page_size: INVENTORY_PAGINATION.MAX_PAGE_SIZE,
    });
    return data
      .filter((item) => this.isLowStock(item))
      .map((item) => this.buildStatusRecord(item));
  }

  async listTransactions(
    factoryId: number,
    itemId?: number,
  ): Promise<IInventoryTransactionRecord[]> {
    assertFactoryId(factoryId);
    const rows = await this.repository.listTransactions(factoryId, itemId);
    return rows.map((r) => ({
      id: r.id,
      factory_id: r.factory_id,
      inventory_item_id: r.inventory_item_id,
      transaction_type: r.transaction_type,
      quantity: String(r.quantity),
      reference_type: r.reference_type ?? null,
      reference_id: r.reference_id ?? null,
      notes: r.notes ?? null,
      created_by: r.created_by ?? null,
      created_at: r.created_at,
    }));
  }

  // ── Helpers ──

  private buildStatusRecord(item: IInventoryItemRecord): IInventoryStatusRecord {
    return {
      item_id: item.id,
      factory_id: item.factory_id,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      location_id: item.location_id,
      location_name: item.location?.name ?? `#${item.location_id}`,
      category_id: item.category_id,
      category_name: item.category?.name ?? `#${item.category_id}`,
      current_quantity: item.current_quantity,
      reorder_threshold: item.reorder_threshold ?? null,
      is_low_stock: this.isLowStock(item),
      is_active: item.is_active,
    };
  }

  private async assertFactoryExists(factoryId: number): Promise<void> {
    const factory = await this.repository.findFactoryById(factoryId);
    if (!factory) {
      throw new NotFoundException(`Factory #${factoryId} not found`);
    }
  }

  private async assertCategoryExists(
    categoryId: number,
    factoryId: number,
  ): Promise<void> {
    const cat = await this.repository.findCategoryById(categoryId, factoryId);
    if (!cat) {
      throw new NotFoundException(
        `Category #${categoryId} not found in factory #${factoryId}`,
      );
    }
    if (!cat.is_active) {
      throw new BadRequestException('Category is inactive');
    }
  }

  private async assertLocationExists(
    locationId: number,
    factoryId: number,
  ): Promise<void> {
    const loc = await this.repository.findLocationById(locationId, factoryId);
    if (!loc) {
      throw new NotFoundException(
        `Location #${locationId} not found in factory #${factoryId}`,
      );
    }
    if (!loc.is_active) {
      throw new BadRequestException('Location is inactive');
    }
  }

  private toCategoryRecord(row: any): IInventoryCategoryRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      name: row.name,
      description: row.description ?? null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private toLocationRecord(row: any): IInventoryLocationRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      name: row.name,
      code: row.code ?? null,
      address: row.address ?? null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private toItemRecord(row: any): IInventoryItemRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      category_id: row.category_id,
      location_id: row.location_id,
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      current_quantity: String(row.current_quantity ?? '0.0000'),
      reorder_threshold:
        row.reorder_threshold != null ? String(row.reorder_threshold) : null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category
        ? { id: row.category.id, name: row.category.name }
        : null,
      location: row.location
        ? { id: row.location.id, name: row.location.name }
        : null,
    };
  }
}
