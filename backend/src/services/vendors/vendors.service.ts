import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { CreateVendorDto, UpdateVendorDto } from './vendors.dto';
import {
  IVendorCreateInput,
  IVendorListOptions,
  IVendorListResult,
  IVendorRecord,
  IVendorUpdateInput,
} from './vendors.interfaces';
import { VendorRepository } from './vendors.repository';
import { Vendor } from './vendors.schema';
import { VENDOR_PAGINATION } from './vendors.constants';
import {
  assertFactoryId,
  normalizeVendorAddress,
  normalizeVendorEmail,
  normalizeVendorGst,
  normalizeVendorName,
  normalizeVendorNotes,
  normalizeVendorPhone,
} from './vendors.validation';

@Injectable()
export class VendorService {
  constructor(
    private readonly vendorRepository: VendorRepository,
    private readonly dbService: DbService,
  ) {}

  async createVendor(dto: CreateVendorDto): Promise<IVendorRecord> {
    assertFactoryId(dto.factory_id);
    await this.assertFactoryExists(dto.factory_id);

    const input: IVendorCreateInput = {
      factory_id: dto.factory_id,
      name: normalizeVendorName(dto.name),
      phone_number: normalizeVendorPhone(dto.phone_number),
      email: normalizeVendorEmail(dto.email),
      address: normalizeVendorAddress(dto.address),
      gst_number: normalizeVendorGst(dto.gst_number),
      notes: normalizeVendorNotes(dto.notes),
      is_active: dto.is_active ?? true,
    };

    await this.assertNoDuplicateVendor(dto.factory_id, {
      name: input.name,
      phone_number: input.phone_number,
    });

    try {
      const created = await this.vendorRepository.createVendor(input);
      return this.toRecord(created);
    } catch (error: any) {
      this.rethrowUniqueViolation(error);
      throw error;
    }
  }

  async updateVendor(
    id: number,
    factoryId: number,
    dto: UpdateVendorDto,
  ): Promise<IVendorRecord> {
    assertFactoryId(factoryId);

    const existing = await this.vendorRepository.findVendorById(id, factoryId);
    if (!existing) {
      throw new NotFoundException(
        `Vendor #${id} not found in factory #${factoryId}`,
      );
    }

    const patch: IVendorUpdateInput = {};

    if (dto.name !== undefined) {
      patch.name = normalizeVendorName(dto.name);
    }
    if (dto.phone_number !== undefined) {
      patch.phone_number = normalizeVendorPhone(dto.phone_number);
    }
    if (dto.email !== undefined) {
      patch.email = normalizeVendorEmail(dto.email);
    }
    if (dto.address !== undefined) {
      patch.address = normalizeVendorAddress(dto.address);
    }
    if (dto.gst_number !== undefined) {
      patch.gst_number = normalizeVendorGst(dto.gst_number);
    }
    if (dto.notes !== undefined) {
      patch.notes = normalizeVendorNotes(dto.notes);
    }
    if (dto.is_active !== undefined) {
      patch.is_active = dto.is_active;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    const nextName = patch.name ?? existing.name;
    const nextPhone = patch.phone_number ?? existing.phone_number;

    await this.assertNoDuplicateVendor(
      factoryId,
      { name: nextName, phone_number: nextPhone },
      id,
    );

    try {
      const updated = await this.vendorRepository.updateVendor(
        id,
        factoryId,
        patch,
      );
      return this.toRecord(updated!);
    } catch (error: any) {
      this.rethrowUniqueViolation(error);
      throw error;
    }
  }

  async getVendor(id: number, factoryId: number): Promise<IVendorRecord> {
    assertFactoryId(factoryId);
    const row = await this.vendorRepository.findVendorById(id, factoryId);
    if (!row) {
      throw new NotFoundException(
        `Vendor #${id} not found in factory #${factoryId}`,
      );
    }
    return this.toRecord(row);
  }

  async listVendors(
    factoryId: number,
    options: IVendorListOptions = {},
  ): Promise<IVendorListResult> {
    assertFactoryId(factoryId);
    await this.assertFactoryExists(factoryId);

    const page = Math.max(1, options.page ?? VENDOR_PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      VENDOR_PAGINATION.MAX_LIMIT,
      Math.max(1, options.limit ?? VENDOR_PAGINATION.DEFAULT_LIMIT),
    );

    const { rows, count } = await this.vendorRepository.listVendors(
      factoryId,
      {
        ...options,
        page,
        limit,
        activeOnly: options.activeOnly ?? true,
      },
    );

    return {
      data: rows.map((r) => this.toRecord(r)),
      total: count,
      page,
      limit,
    };
  }

  async searchVendors(
    factoryId: number,
    query: string,
    options: IVendorListOptions = {},
  ): Promise<IVendorListResult> {
    const trimmed = query?.trim();
    if (!trimmed) {
      throw new BadRequestException('Search query is required');
    }
    return this.listVendors(factoryId, {
      ...options,
      search: trimmed,
      activeOnly: options.activeOnly ?? true,
    });
  }

  async deactivateVendor(
    id: number,
    factoryId: number,
  ): Promise<{ message: string; data: IVendorRecord }> {
    assertFactoryId(factoryId);

    const row = await this.vendorRepository.deactivateVendor(id, factoryId);
    if (!row) {
      throw new NotFoundException(
        `Vendor #${id} not found in factory #${factoryId}`,
      );
    }

    return {
      message: 'Vendor deactivated successfully',
      data: this.toRecord(row),
    };
  }

  private async assertFactoryExists(factoryId: number): Promise<void> {
    const factory = await this.dbService.sqlService.Factory.findByPk(factoryId);
    if (!factory) {
      throw new NotFoundException(`Factory #${factoryId} not found`);
    }
  }

  private async assertNoDuplicateVendor(
    factoryId: number,
    params: { name: string; phone_number: string },
    excludeId?: number,
  ): Promise<void> {
    const nameTaken = await this.vendorRepository.vendorExists(factoryId, {
      name: params.name,
      excludeId,
    });
    if (nameTaken) {
      throw new ConflictException(
        `A vendor named "${params.name}" already exists in this factory`,
      );
    }

    const phoneTaken = await this.vendorRepository.vendorExists(factoryId, {
      phone_number: params.phone_number,
      excludeId,
    });
    if (phoneTaken) {
      throw new ConflictException(
        `A vendor with phone number "${params.phone_number}" already exists in this factory`,
      );
    }
  }

  private rethrowUniqueViolation(error: any): void {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const fields = (error?.fields ?? {}) as Record<string, unknown>;
      if ('name' in fields || 'factory_id' in fields) {
        throw new ConflictException(
          'A vendor with this name already exists in this factory',
        );
      }
      if ('phone_number' in fields) {
        throw new ConflictException(
          'A vendor with this phone number already exists in this factory',
        );
      }
      throw new ConflictException('Vendor already exists in this factory');
    }
  }

  private toRecord(row: Vendor): IVendorRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      name: row.name,
      phone_number: row.phone_number,
      email: row.email ?? null,
      address: row.address ?? null,
      gst_number: row.gst_number ?? null,
      notes: row.notes ?? null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
