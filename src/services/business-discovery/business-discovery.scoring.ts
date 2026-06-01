import {
  DISCOVERY_BUCKET,
  DISCOVERY_BUCKET_ORDER,
  DISCOVERY_BUCKET_LABELS,
  DiscoveryBucket,
} from './business-discovery.constants';
import { IBucketProgress, IBusinessReadinessScore } from './business-discovery.interfaces';

export interface IScoringSignals {
  factoryName?: string | null;
  factoryAddress?: string | null;
  industry?: string | null;
  businessType?: string | null;
  departmentCount?: number;
  managerCount?: number;
  workerCount?: number;
  categoryCount?: number;
  locationCount?: number;
  itemCount?: number;
  vendorCount?: number;
  bucketData?: Record<string, unknown>;
}

const IDENTITY_FIELDS = ['business_name', 'address', 'industry', 'business_type'];
const ORG_FIELDS = ['departments', 'managers', 'workers'];
const INVENTORY_FIELDS = ['categories', 'locations', 'items'];
const VENDOR_FIELDS = ['vendor_list', 'vendor_categories', 'vendor_contacts'];

function pct(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

function fieldScore(
  bucketData: Record<string, unknown> | undefined,
  keys: string[],
  signals: number[],
): number {
  let completed = 0;
  keys.forEach((key, i) => {
    const manual = bucketData?.[key];
    const signalOk = (signals[i] ?? 0) > 0;
    if (manual === true || manual === 'done' || signalOk) completed++;
  });
  return pct(completed, keys.length);
}

export function computeBucketScores(signals: IScoringSignals): IBusinessReadinessScore {
  const data = signals.bucketData ?? {};

  const identity = Math.max(
    fieldScore(data, IDENTITY_FIELDS, [
      signals.factoryName ? 1 : 0,
      signals.factoryAddress ? 1 : 0,
      signals.industry ? 1 : 0,
      signals.businessType ? 1 : 0,
    ]),
    pct(
      (signals.factoryName ? 1 : 0) + (signals.factoryAddress ? 1 : 0),
      2,
    ),
  );

  const organization = Math.max(
    fieldScore(data, ORG_FIELDS, [
      signals.departmentCount ?? 0,
      signals.managerCount ?? 0,
      signals.workerCount ?? 0,
    ]),
    pct(
      Math.min(signals.departmentCount ?? 0, 1) +
        Math.min(signals.workerCount ?? 0, 1),
      2,
    ),
  );

  const inventory = Math.max(
    fieldScore(data, INVENTORY_FIELDS, [
      signals.categoryCount ?? 0,
      signals.locationCount ?? 0,
      signals.itemCount ?? 0,
    ]),
    pct(
      ((signals.categoryCount ?? 0) > 0 ? 1 : 0) +
        ((signals.itemCount ?? 0) > 0 ? 1 : 0),
      2,
    ),
  );

  const vendors = Math.max(
    fieldScore(data, VENDOR_FIELDS, [
      signals.vendorCount ?? 0,
      signals.vendorCount ?? 0,
      signals.vendorCount ?? 0,
    ]),
    signals.vendorCount && signals.vendorCount > 0 ? 100 : 0,
  );

  const overall = Math.round(
    (identity + organization + inventory + vendors) / 4,
  );

  return {
    identity,
    organization,
    inventory,
    vendors,
    overall,
    status: 'ACTIVE' as const,
  };
}

export function buildBucketProgress(
  scores: IBusinessReadinessScore,
): IBucketProgress[] {
  const map: Record<DiscoveryBucket, number> = {
    [DISCOVERY_BUCKET.BUSINESS_IDENTITY]: scores.identity,
    [DISCOVERY_BUCKET.ORGANIZATION]: scores.organization,
    [DISCOVERY_BUCKET.INVENTORY]: scores.inventory,
    [DISCOVERY_BUCKET.VENDORS]: scores.vendors,
  };

  const fields: Record<DiscoveryBucket, string[]> = {
    [DISCOVERY_BUCKET.BUSINESS_IDENTITY]: IDENTITY_FIELDS,
    [DISCOVERY_BUCKET.ORGANIZATION]: ORG_FIELDS,
    [DISCOVERY_BUCKET.INVENTORY]: INVENTORY_FIELDS,
    [DISCOVERY_BUCKET.VENDORS]: VENDOR_FIELDS,
  };

  return DISCOVERY_BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: DISCOVERY_BUCKET_LABELS[bucket],
    completion: map[bucket],
    fields: fields[bucket],
  }));
}

export function mergeBucketDataField(
  existing: Record<string, unknown>,
  field: string,
  value: unknown,
): Record<string, unknown> {
  return { ...existing, [field]: value };
}
