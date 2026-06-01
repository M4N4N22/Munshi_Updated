import { computeBucketScores, buildBucketProgress } from './business-discovery.scoring';
import { DISCOVERY_BUCKET } from './business-discovery.constants';

describe('BusinessDiscovery scoring', () => {
  it('computes readiness from signals', () => {
    const scores = computeBucketScores({
      factoryName: 'Acme',
      factoryAddress: 'Pune',
      departmentCount: 2,
      workerCount: 5,
      categoryCount: 1,
      itemCount: 10,
      vendorCount: 3,
      bucketData: {},
    });
    expect(scores.identity).toBeGreaterThan(0);
    expect(scores.overall).toBeGreaterThan(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
  });

  it('builds bucket progress list', () => {
    const buckets = buildBucketProgress({
      identity: 100,
      organization: 50,
      inventory: 20,
      vendors: 0,
      overall: 43,
      status: 'ACTIVE',
    });
    expect(buckets).toHaveLength(4);
    expect(buckets.find((b) => b.bucket === DISCOVERY_BUCKET.BUSINESS_IDENTITY)?.completion).toBe(100);
  });
});
