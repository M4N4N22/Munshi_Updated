import { BusinessDiscoveryService } from './business-discovery.service';
import { BusinessDiscoveryRepository } from './business-discovery.repository';
import {
  BUSINESS_DISCOVERY_STATUS,
  DISCOVERY_REMINDER_STAGE,
} from './business-discovery.constants';

describe('BusinessDiscoveryService reminders', () => {
  let service: BusinessDiscoveryService;
  let repository: jest.Mocked<BusinessDiscoveryRepository>;
  let profile: any;

  beforeEach(() => {
    profile = {
      id: 1,
      factory_id: 3,
      status: BUSINESS_DISCOVERY_STATUS.ACTIVE,
      identity_completion: 0,
      organization_completion: 0,
      manager_completion: 0,
      workforce_completion: 0,
      inventory_completion: 0,
      vendor_completion: 0,
      overall_completion: 0,
      bucket_data: {},
      reminder_stage: DISCOVERY_REMINDER_STAGE.NONE,
      last_activity_at: new Date(),
      next_reminder_at: new Date(Date.now() - 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    repository = {
      findByFactoryId: jest.fn().mockResolvedValue(profile),
      create: jest.fn(),
      save: jest.fn().mockImplementation(async (row) => row),
      findDueReminders: jest.fn(),
    } as any;

    const dbService = {
      sqlService: {
        Factory: { findByPk: jest.fn().mockResolvedValue({ name: 'Test', address: 'A' }) },
        Department: { count: jest.fn().mockResolvedValue(0) },
        FactoryUser: { findAll: jest.fn().mockResolvedValue([]) },
        InventoryCategory: { count: jest.fn().mockResolvedValue(0) },
        InventoryLocation: { count: jest.fn().mockResolvedValue(0) },
        InventoryItem: { count: jest.fn().mockResolvedValue(0) },
        Vendor: { count: jest.fn().mockResolvedValue(0) },
      },
    } as any;

    service = new BusinessDiscoveryService(repository, dbService);
  });

  it('pauses profile', async () => {
    const row = await service.pause(3);
    expect(row.status).toBe(BUSINESS_DISCOVERY_STATUS.PAUSED);
  });

  it('resumes profile', async () => {
    profile.status = BUSINESS_DISCOVERY_STATUS.PAUSED;
    const row = await service.resume(3);
    expect(row.status).toBe(BUSINESS_DISCOVERY_STATUS.ACTIVE);
  });

  it('sends first reminder then schedules final', async () => {
    const result = await service.processReminder(3);
    expect(result.sent).toBe(true);
    expect(profile.reminder_stage).toBe(DISCOVERY_REMINDER_STAGE.FIRST_SENT);
  });

  it('stores source_type on recordBucketField', async () => {
    await service.recordBucketField(3, 'BUSINESS_IDENTITY', 'industry', 'Packaging');
    expect(profile.bucket_data['BUSINESS_IDENTITY.industry']).toBe('Packaging');
    expect(profile.bucket_data['BUSINESS_IDENTITY.industry__source']).toBe('CHAT');
  });

  it('sanitizeProfileData removes operational pollution', async () => {
    profile.bucket_data = {
      'BUSINESS_IDENTITY.business_name': 'Acme',
      'BUSINESS_IDENTITY.address': 'inventory status batao',
    };
    const row = await service.sanitizeProfileData(3);
    expect(row.bucket_data['BUSINESS_IDENTITY.business_name']).toBe('Acme');
    expect(row.bucket_data['BUSINESS_IDENTITY.address']).toBeUndefined();
  });
});
