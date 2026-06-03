import { BusinessDiscoveryIntegrationService } from './business-discovery-integration.service';
import { DISCOVERY_BUCKET } from './business-discovery.constants';

describe('BusinessDiscoveryIntegrationService', () => {
  const profile = {
    bucket_data: {
      'ORGANIZATION_STRUCTURE.departments': 'Production',
      'MANAGER_DISCOVERY.entry_0.name': 'Ravi',
      'MANAGER_DISCOVERY.entry_0.phone': '919999999999',
      'WORKFORCE_DISCOVERY.entry_0.name': 'Anita',
      'VENDOR_DISCOVERY.vendor_name': 'Shree Supplies',
    },
  };

  let service: BusinessDiscoveryIntegrationService;
  let discoveryService: { getProfile: jest.Mock };

  beforeEach(() => {
    discoveryService = {
      getProfile: jest.fn().mockResolvedValue(profile),
    };
    service = new BusinessDiscoveryIntegrationService(discoveryService as any);
  });

  it('exposes discovered departments for department module', async () => {
    const depts = await service.getDiscoveredDepartments(3);
    expect(depts).toContain('Production');
  });

  it('exposes discovered managers for worker onboarding', async () => {
    const managers = await service.getDiscoveredManagers(3);
    expect(managers[0].name).toBe('Ravi');
    expect(managers[0].phone).toBe('919999999999');
  });

  it('exposes discovered workforce entries', async () => {
    const workers = await service.getDiscoveredWorkers(3);
    expect(workers[0].name).toBe('Anita');
  });

  it('exposes vendor hints from vendor discovery bucket', async () => {
    const vendors = await service.getDiscoveredVendors(3);
    expect(vendors[0].vendor_name).toBe('Shree Supplies');
  });

  it('reads legacy inventory bucket keys', async () => {
    discoveryService.getProfile.mockResolvedValue({
      bucket_data: {
        [`${DISCOVERY_BUCKET.INVENTORY}.categories`]: 'Raw material',
      },
    });
    const hints = await service.getDiscoveredInventoryHints(3);
    expect(hints.categories).toContain('Raw material');
  });
});
