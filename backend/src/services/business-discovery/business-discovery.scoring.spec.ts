import { computeBucketScores, buildBucketProgress } from './business-discovery.scoring';
import { DISCOVERY_BUCKET } from './business-discovery.constants';

describe('BusinessDiscovery scoring (Prompt 13)', () => {
  it('computes six-bucket readiness dynamically', () => {
    const scores = computeBucketScores({
      factoryName: 'Acme',
      factoryAddress: 'Pune',
      departmentCount: 2,
      managerCount: 2,
      workerCount: 5,
      categoryCount: 1,
      itemCount: 10,
      vendorCount: 3,
      bucketData: {},
    });
    expect(scores.identity).toBeGreaterThan(0);
    expect(scores.organization_structure).toBeGreaterThan(0);
    expect(scores.managers).toBeGreaterThan(0);
    expect(scores.workforce).toBeGreaterThan(0);
    expect(scores.overall).toBeGreaterThan(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
    const expectedOverall = Math.round(
      (scores.identity +
        scores.organization_structure +
        scores.managers +
        scores.workforce +
        scores.inventory +
        scores.vendors) /
        6,
    );
    expect(scores.overall).toBe(expectedOverall);
  });

  it('builds six bucket progress entries', () => {
    const buckets = buildBucketProgress({
      identity: 100,
      organization_structure: 75,
      managers: 40,
      workforce: 20,
      inventory: 10,
      vendors: 0,
      overall: 41,
      status: 'ACTIVE',
    });
    expect(buckets).toHaveLength(6);
    expect(
      buckets.find((b) => b.bucket === DISCOVERY_BUCKET.BUSINESS_IDENTITY)?.completion,
    ).toBe(100);
    expect(buckets.every((b) => b.source_types_supported.includes('CHAT'))).toBe(true);
  });

  it('scores repeatable manager entries from bucket_data', () => {
    const scores = computeBucketScores({
      bucketData: {
        'MANAGER_DISCOVERY.entry_0.name': 'Ravi',
        'MANAGER_DISCOVERY.entry_0.phone': '919999999999',
        'MANAGER_DISCOVERY.entry_1.name': 'Sita',
      },
      departmentCount: 0,
      managerCount: 0,
      workerCount: 0,
    });
    expect(scores.managers).toBeGreaterThan(0);
  });
});
