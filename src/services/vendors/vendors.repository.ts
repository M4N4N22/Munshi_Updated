import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { Op, WhereOptions } from 'sequelize';
import {
  IVendorCreateInput,
  IVendorExistsOptions,
  IVendorListOptions,
  IVendorUpdateInput,
} from './vendors.interfaces';
import { Vendor } from './vendors.schema';
import { VENDOR_PAGINATION } from './vendors.constants';

@Injectable()
export class VendorRepository {
  readonly model: typeof Vendor;

  constructor(private readonly dbService: DbService) {
    this.model = this.dbService.sqlService.Vendor;
  }

  async createVendor(input: IVendorCreateInput): Promise<Vendor> {
    return this.model.create({
      factory_id: input.factory_id,
      name: input.name,
      phone_number: input.phone_number,
      email: input.email ?? null,
      address: input.address ?? null,
      gst_number: input.gst_number ?? null,
      notes: input.notes ?? null,
      is_active: input.is_active ?? true,
    } as any);
  }

  async updateVendor(
    id: number,
    factoryId: number,
    patch: IVendorUpdateInput,
  ): Promise<Vendor | null> {
    const row = await this.model.findOne({
      where: { id, factory_id: factoryId },
    });
    if (!row) return null;
    await row.update(patch as any);
    return row;
  }

  async findVendorById(
    id: number,
    factoryId: number,
  ): Promise<Vendor | null> {
    return this.model.findOne({
      where: { id, factory_id: factoryId },
    });
  }

  async findVendorByPhone(
    factoryId: number,
    phoneNumber: string,
    excludeId?: number,
  ): Promise<Vendor | null> {
    const where: WhereOptions = {
      factory_id: factoryId,
      phone_number: { [Op.iLike]: phoneNumber },
    };
    if (excludeId != null) {
      (where as any).id = { [Op.ne]: excludeId };
    }
    return this.model.findOne({ where });
  }

  async listVendors(
    factoryId: number,
    options: IVendorListOptions = {},
  ): Promise<{ rows: Vendor[]; count: number }> {
    const page = Math.max(1, options.page ?? VENDOR_PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      VENDOR_PAGINATION.MAX_LIMIT,
      Math.max(1, options.limit ?? VENDOR_PAGINATION.DEFAULT_LIMIT),
    );

    const where = this.buildListWhere(factoryId, options);

    return this.model.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['name', 'ASC']],
    });
  }

  async searchVendors(
    factoryId: number,
    query: string,
    options: IVendorListOptions = {},
  ): Promise<{ rows: Vendor[]; count: number }> {
    return this.listVendors(factoryId, {
      ...options,
      search: query,
    });
  }

  async deactivateVendor(
    id: number,
    factoryId: number,
  ): Promise<Vendor | null> {
    const row = await this.model.findOne({
      where: { id, factory_id: factoryId },
    });
    if (!row) return null;
    await row.update({ is_active: false } as any);
    return row;
  }

  async vendorExists(
    factoryId: number,
    options: IVendorExistsOptions,
  ): Promise<boolean> {
    const conditions: WhereOptions[] = [];

    if (options.name) {
      conditions.push({
        name: { [Op.iLike]: options.name.trim() },
      });
    }

    if (options.phone_number) {
      conditions.push({
        phone_number: { [Op.iLike]: options.phone_number },
      });
    }

    if (conditions.length === 0) {
      return false;
    }

    const where: WhereOptions = {
      factory_id: factoryId,
      [Op.or]: conditions,
    };

    if (options.excludeId != null) {
      (where as any).id = { [Op.ne]: options.excludeId };
    }

    const count = await this.model.count({ where });
    return count > 0;
  }

  private buildListWhere(
    factoryId: number,
    options: IVendorListOptions,
  ): WhereOptions {
    const where: WhereOptions = { factory_id: factoryId };

    if (options.activeOnly !== false) {
      (where as any).is_active = true;
    }

    const search = options.search?.trim();
    if (search) {
      (where as any)[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
        { gst_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    return where;
  }
}
