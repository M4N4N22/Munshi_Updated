import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VendorService } from 'src/services/vendors/vendors.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { PURCHASE_REQUEST_STATUS } from './purchase-requests.constants';
import { PurchaseRequestRepository } from './purchase-requests.repository';
import { PurchaseRequestService } from './purchase-requests.service';
import { PurchaseRequestValidationService } from './purchase-requests.validation';

describe('PurchaseRequestService', () => {
  let service: PurchaseRequestService;
  const repository = {
    createWithItems: jest.fn(),
    setRequestNumber: jest.fn(),
    appendAudit: jest.fn(),
    findById: jest.fn(),
    listByFactory: jest.fn(),
    updateRow: jest.fn(),
    replaceItems: jest.fn(),
    listAudit: jest.fn(),
    sequelize: {
      transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb({})),
    },
  };
  const validationService = {
    assertFactoryMember: jest.fn(),
    assertCanApprove: jest.fn(),
    assertStatusTransition: jest.fn(),
  };
  const vendorService = {
    getVendor: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequestService,
        { provide: PurchaseRequestRepository, useValue: repository },
        { provide: PurchaseRequestValidationService, useValue: validationService },
        { provide: VendorService, useValue: vendorService },
      ],
    }).compile();
    service = module.get(PurchaseRequestService);
    validationService.assertFactoryMember.mockResolvedValue({ role: USER_ROLE.OWNER });
    validationService.assertCanApprove.mockResolvedValue(undefined);
    validationService.assertStatusTransition.mockImplementation(() => undefined);
  });

  it('creates a draft purchase request with request number', async () => {
    repository.createWithItems.mockResolvedValue({
      id: 7,
      factory_id: 3,
      title: 'Need cement',
      status: PURCHASE_REQUEST_STATUS.DRAFT,
      requested_by: 18,
      priority: 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.findById.mockResolvedValue({
      id: 7,
      factory_id: 3,
      request_number: 'PR-3-20260531-7',
      title: 'Need cement',
      description: null,
      status: PURCHASE_REQUEST_STATUS.DRAFT,
      requested_by: 18,
      approved_by: null,
      assigned_vendor_id: null,
      priority: 'NORMAL',
      requested_at: null,
      approved_at: null,
      closed_at: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });

    const result = await service.createPurchaseRequest({
      factory_id: 3,
      requested_by: 18,
      title: 'Need cement',
      items: [{ item_name: 'Cement', requested_quantity: '50', unit: 'bags' }],
    });

    expect(result.id).toBe(7);
    expect(repository.setRequestNumber).toHaveBeenCalled();
    expect(repository.appendAudit).toHaveBeenCalledWith(
      7,
      expect.any(String),
      18,
      expect.any(Object),
      expect.anything(),
    );
  });

  it('rejects approve when user lacks role', async () => {
    validationService.assertCanApprove.mockRejectedValue(
      new ForbiddenException('Only owners or managers'),
    );
    await expect(
      service.approvePurchaseRequest(1, 3, 22),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assigns vendor on approved request', async () => {
    repository.findById.mockResolvedValue({
      id: 1,
      factory_id: 3,
      status: PURCHASE_REQUEST_STATUS.APPROVED,
      assigned_vendor_id: null,
      update: jest.fn(),
    });
    repository.findById
      .mockResolvedValueOnce({
        id: 1,
        factory_id: 3,
        status: PURCHASE_REQUEST_STATUS.APPROVED,
        assigned_vendor_id: null,
      })
      .mockResolvedValueOnce({
        id: 1,
        factory_id: 3,
        request_number: 'PR-3-20260531-1',
        title: 'Steel',
        description: null,
        status: PURCHASE_REQUEST_STATUS.ASSIGNED_TO_VENDOR,
        requested_by: 18,
        approved_by: 18,
        assigned_vendor_id: 2,
        priority: 'NORMAL',
        requested_at: new Date(),
        approved_at: new Date(),
        closed_at: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      });
    vendorService.getVendor.mockResolvedValue({ id: 2 });

    const result = await service.assignVendor(1, 3, 2, 18);
    expect(result.status).toBe(PURCHASE_REQUEST_STATUS.ASSIGNED_TO_VENDOR);
    expect(result.assigned_vendor_id).toBe(2);
  });

  it('blocks invalid status transition', async () => {
    validationService.assertStatusTransition.mockImplementation(() => {
      throw new BadRequestException('Cannot transition');
    });
    repository.findById.mockResolvedValue({
      id: 1,
      factory_id: 3,
      status: PURCHASE_REQUEST_STATUS.DRAFT,
    });
    await expect(
      service.approvePurchaseRequest(1, 3, 18),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
