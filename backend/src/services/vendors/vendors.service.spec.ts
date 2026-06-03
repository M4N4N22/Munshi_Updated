import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { VendorService } from './vendors.service';
import { VendorRepository } from './vendors.repository';
import { DbService } from 'src/core/services/db-service/db.service';
import { Vendor } from './vendors.schema';

describe('VendorService', () => {
  let service: VendorService;
  let vendorRepository: jest.Mocked<VendorRepository>;
  let dbService: { sqlService: { Factory: { findByPk: jest.Mock } } };

  const factoryRow = { id: 1, name: 'Test Factory' };

  const vendorRow = {
    id: 10,
    factory_id: 1,
    name: 'Acme Supplies',
    phone_number: '9876543210',
    email: 'a@acme.test',
    address: null,
    gst_number: null,
    notes: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as Vendor;

  beforeEach(() => {
    vendorRepository = {
      createVendor: jest.fn(),
      updateVendor: jest.fn(),
      findVendorById: jest.fn(),
      findVendorByPhone: jest.fn(),
      listVendors: jest.fn(),
      searchVendors: jest.fn(),
      deactivateVendor: jest.fn(),
      vendorExists: jest.fn(),
      model: {} as any,
    } as unknown as jest.Mocked<VendorRepository>;

    dbService = {
      sqlService: {
        Factory: {
          findByPk: jest.fn().mockResolvedValue(factoryRow),
        },
      },
    };

    service = new VendorService(
      vendorRepository,
      dbService as unknown as DbService,
    );
  });

  describe('createVendor', () => {
    it('creates vendor when factory exists and no duplicates', async () => {
      vendorRepository.vendorExists.mockResolvedValue(false);
      vendorRepository.createVendor.mockResolvedValue(vendorRow);

      const result = await service.createVendor({
        factory_id: 1,
        name: 'Acme Supplies',
        phone_number: '9876543210',
        email: 'a@acme.test',
      });

      expect(result.name).toBe('Acme Supplies');
      expect(result.phone_number).toBe('9876543210');
      expect(vendorRepository.createVendor).toHaveBeenCalled();
    });

    it('throws ConflictException when duplicate name', async () => {
      vendorRepository.vendorExists.mockResolvedValueOnce(true);

      await expect(
        service.createVendor({
          factory_id: 1,
          name: 'Acme Supplies',
          phone_number: '9876543210',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when duplicate phone', async () => {
      vendorRepository.vendorExists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await expect(
        service.createVendor({
          factory_id: 1,
          name: 'Other Vendor',
          phone_number: '9876543210',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when factory missing', async () => {
      dbService.sqlService.Factory.findByPk.mockResolvedValue(null);

      await expect(
        service.createVendor({
          factory_id: 99,
          name: 'Acme',
          phone_number: '9876543210',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listVendors', () => {
    it('returns paginated result', async () => {
      vendorRepository.listVendors.mockResolvedValue({
        rows: [vendorRow],
        count: 1,
      });

      const result = await service.listVendors(1, { page: 1, limit: 25 });

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 10, name: 'Acme Supplies' }),
        ]),
        total: 1,
        page: 1,
        limit: 25,
      });
    });
  });

  describe('searchVendors', () => {
    it('requires non-empty query', async () => {
      await expect(service.searchVendors(1, '  ')).rejects.toThrow(
        'Search query is required',
      );
    });

    it('delegates to list with search term', async () => {
      vendorRepository.listVendors.mockResolvedValue({
        rows: [vendorRow],
        count: 1,
      });

      await service.searchVendors(1, 'acme', { page: 1, limit: 10 });

      expect(vendorRepository.listVendors).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ search: 'acme', page: 1, limit: 10 }),
      );
    });
  });

  describe('deactivateVendor', () => {
    it('soft-deactivates vendor', async () => {
      vendorRepository.deactivateVendor.mockResolvedValue({
        ...vendorRow,
        is_active: false,
      } as Vendor);

      const result = await service.deactivateVendor(10, 1);

      expect(result.message).toBe('Vendor deactivated successfully');
      expect(result.data.is_active).toBe(false);
    });

    it('throws when vendor not found', async () => {
      vendorRepository.deactivateVendor.mockResolvedValue(null);

      await expect(service.deactivateVendor(10, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getVendor', () => {
    it('enforces factory isolation', async () => {
      vendorRepository.findVendorById.mockResolvedValue(null);

      await expect(service.getVendor(10, 2)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
