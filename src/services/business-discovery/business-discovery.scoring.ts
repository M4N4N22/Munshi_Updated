import {
  ACTIVE_DISCOVERY_BUCKET_ORDER,
  ActiveDiscoveryBucket,
  DISCOVERY_BUCKET,
  DISCOVERY_BUCKET_LABELS,
} from './business-discovery.constants';
import {
  bucketFieldKeys,
  DISCOVERY_SOURCE_TYPE,
} from './business-discovery.fields';
import { IBucketProgress, IBusinessReadinessScore } from './business-discovery.interfaces';
import { sanitizeBucketData } from './business-discovery.hygiene';

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

function pct(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

function hasBucketField(
  data: Record<string, unknown>,
  bucket: ActiveDiscoveryBucket,
  fieldKey: string,
): boolean {
  const flat = `${bucket}.${fieldKey}`;
  if (data[flat] === true || data[flat] === 'done') return true;
  if (typeof data[flat] === 'string' && data[flat].length > 0) return true;
  return Object.keys(data).some(
    (k) =>
      k.startsWith(`${bucket}.entry_`) &&
      k.endsWith(`.${fieldKey}`) &&
      data[k] != null &&
      data[k] !== '',
  );
}

function countRepeatableEntities(
  data: Record<string, unknown>,
  bucket: ActiveDiscoveryBucket,
  fieldKeys: string[],
): number {
  let count = 0;
  for (let i = 0; i < 20; i++) {
    const filled = fieldKeys.filter((k) => {
      const v = data[`${bucket}.entry_${i}.${k}`];
      return v === true || v === 'done' || (typeof v === 'string' && v.length > 0);
    });
    if (filled.length > 0) count++;
    else if (i > 0) break;
  }
  return count;
}

function legacyHasField(
  data: Record<string, unknown>,
  legacyBucket: string,
  fieldKey: string,
): boolean {
  const key = `${legacyBucket}.${fieldKey}`;
  const val = data[key];
  return val === true || val === 'done' || (typeof val === 'string' && val.length > 0);
}

function scoreBucket(
  data: Record<string, unknown>,
  bucket: ActiveDiscoveryBucket,
  fieldKeys: string[],
  signalChecks: boolean[],
): number {
  let completed = 0;
  fieldKeys.forEach((key, i) => {
    if (hasBucketField(data, bucket, key) || signalChecks[i]) completed++;
  });
  return pct(completed, fieldKeys.length);
}

function scoreRepeatableBucket(
  data: Record<string, unknown>,
  bucket: ActiveDiscoveryBucket,
  fieldKeys: string[],
  minEntitiesFromSignals: number,
): number {
  const entityCount = Math.max(
    countRepeatableEntities(data, bucket, fieldKeys),
    minEntitiesFromSignals,
  );
  const target = 3;
  return pct(Math.min(entityCount, target), target);
}

export function computeBucketScores(signals: IScoringSignals): IBusinessReadinessScore {
  const raw = signals.bucketData ?? {};
  const data = sanitizeBucketData(raw);

  const identityKeys = bucketFieldKeys(DISCOVERY_BUCKET.BUSINESS_IDENTITY);
  const identity = Math.max(
    scoreBucket(data, DISCOVERY_BUCKET.BUSINESS_IDENTITY, identityKeys, [
      !!signals.factoryName,
      !!signals.factoryAddress,
      !!signals.industry,
      !!signals.businessType,
    ]),
    pct((signals.factoryName ? 1 : 0) + (signals.factoryAddress ? 1 : 0), 2),
  );

  const orgKeys = bucketFieldKeys(DISCOVERY_BUCKET.ORGANIZATION_STRUCTURE);
  const organization_structure = Math.max(
    scoreBucket(data, DISCOVERY_BUCKET.ORGANIZATION_STRUCTURE, orgKeys, [
      (signals.departmentCount ?? 0) > 0,
      false,
      false,
      false,
      false,
    ]),
    pct(
      Math.min(signals.departmentCount ?? 0, 1) +
        (legacyHasField(data, DISCOVERY_BUCKET.ORGANIZATION, 'departments') ? 1 : 0),
      2,
    ),
  );

  const managers = Math.max(
    scoreRepeatableBucket(
      data,
      DISCOVERY_BUCKET.MANAGER_DISCOVERY,
      bucketFieldKeys(DISCOVERY_BUCKET.MANAGER_DISCOVERY),
      Math.min(signals.managerCount ?? 0, 3),
    ),
    legacyHasField(data, DISCOVERY_BUCKET.ORGANIZATION, 'managers') ? 33 : 0,
  );

  const workforce = Math.max(
    scoreRepeatableBucket(
      data,
      DISCOVERY_BUCKET.WORKFORCE_DISCOVERY,
      bucketFieldKeys(DISCOVERY_BUCKET.WORKFORCE_DISCOVERY),
      Math.min(signals.workerCount ?? 0, 3),
    ),
    legacyHasField(data, DISCOVERY_BUCKET.ORGANIZATION, 'workers') ? 33 : 0,
  );

  const inventoryKeys = bucketFieldKeys(DISCOVERY_BUCKET.INVENTORY_DISCOVERY);
  const inventory = Math.max(
    scoreBucket(data, DISCOVERY_BUCKET.INVENTORY_DISCOVERY, inventoryKeys, [
      (signals.categoryCount ?? 0) > 0,
      (signals.locationCount ?? 0) > 0,
      (signals.itemCount ?? 0) > 0,
      false,
      false,
    ]),
    pct(
      ((signals.categoryCount ?? 0) > 0 ? 1 : 0) +
        ((signals.itemCount ?? 0) > 0 ? 1 : 0),
      2,
    ),
    scoreBucket(data, DISCOVERY_BUCKET.INVENTORY_DISCOVERY, inventoryKeys.slice(0, 3), [
      legacyHasField(data, DISCOVERY_BUCKET.INVENTORY, 'categories'),
      legacyHasField(data, DISCOVERY_BUCKET.INVENTORY, 'locations'),
      legacyHasField(data, DISCOVERY_BUCKET.INVENTORY, 'items'),
    ]),
  );

  const vendorKeys = bucketFieldKeys(DISCOVERY_BUCKET.VENDOR_DISCOVERY);
  const vendors = Math.max(
    scoreBucket(data, DISCOVERY_BUCKET.VENDOR_DISCOVERY, vendorKeys, [
      (signals.vendorCount ?? 0) > 0,
      (signals.vendorCount ?? 0) > 0,
      false,
      false,
      false,
    ]),
    (signals.vendorCount ?? 0) > 0 ? 100 : 0,
    scoreBucket(data, DISCOVERY_BUCKET.VENDOR_DISCOVERY, ['vendor_name'], [
      legacyHasField(data, DISCOVERY_BUCKET.VENDORS, 'vendor_list'),
    ]),
  );

  const parts = [identity, organization_structure, managers, workforce, inventory, vendors];
  const overall = Math.round(
    parts.reduce((a, b) => a + b, 0) / ACTIVE_DISCOVERY_BUCKET_ORDER.length,
  );

  return {
    identity,
    organization_structure,
    managers,
    workforce,
    inventory,
    vendors,
    overall,
    status: 'ACTIVE' as const,
    organization: organization_structure,
  };
}

export function buildBucketProgress(
  scores: IBusinessReadinessScore,
): IBucketProgress[] {
  const map: Record<ActiveDiscoveryBucket, number> = {
    [DISCOVERY_BUCKET.BUSINESS_IDENTITY]: scores.identity,
    [DISCOVERY_BUCKET.ORGANIZATION_STRUCTURE]: scores.organization_structure,
    [DISCOVERY_BUCKET.MANAGER_DISCOVERY]: scores.managers,
    [DISCOVERY_BUCKET.WORKFORCE_DISCOVERY]: scores.workforce,
    [DISCOVERY_BUCKET.INVENTORY_DISCOVERY]: scores.inventory,
    [DISCOVERY_BUCKET.VENDOR_DISCOVERY]: scores.vendors,
  };

  return ACTIVE_DISCOVERY_BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: DISCOVERY_BUCKET_LABELS[bucket],
    completion: map[bucket],
    fields: bucketFieldKeys(bucket),
    source_types_supported: [
      DISCOVERY_SOURCE_TYPE.CHAT,
      DISCOVERY_SOURCE_TYPE.DOCUMENT,
    ],
  }));
}

export function mergeBucketDataField(
  existing: Record<string, unknown>,
  field: string,
  value: unknown,
  sourceType?: string,
): Record<string, unknown> {
  const next = { ...existing, [field]: value };
  if (sourceType) {
    next[`${field}__source`] = sourceType;
  }
  return next;
}
