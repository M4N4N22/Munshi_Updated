import {
  ACTIVE_DISCOVERY_BUCKET_ORDER,
  ActiveDiscoveryBucket,
  DISCOVERY_BUCKET_LABELS,
} from './business-discovery.constants';

export interface IDiscoveryFieldDef {
  key: string;
  prompt: string;
}

export const DISCOVERY_SOURCE_TYPE = {
  CHAT: 'CHAT',
  DOCUMENT: 'DOCUMENT',
} as const;

export type DiscoverySourceType =
  (typeof DISCOVERY_SOURCE_TYPE)[keyof typeof DISCOVERY_SOURCE_TYPE];

/** Progressive / repeatable buckets support multiple entities (manager #2, worker #4). */
export const REPEATABLE_DISCOVERY_BUCKETS: ActiveDiscoveryBucket[] = [
  'MANAGER_DISCOVERY',
  'WORKFORCE_DISCOVERY',
];

export const BUCKET_FIELD_DEFINITIONS: Record<
  ActiveDiscoveryBucket,
  IDiscoveryFieldDef[]
> = {
  BUSINESS_IDENTITY: [
    { key: 'business_name', prompt: 'What is your *business name*?' },
    { key: 'address', prompt: 'What is your business *address*?' },
    { key: 'industry', prompt: 'Which *industry* are you in?' },
    {
      key: 'business_type',
      prompt: 'What *type* of business is it? (e.g. manufacturing, trading)',
    },
  ],
  ORGANIZATION_STRUCTURE: [
    { key: 'departments', prompt: 'Name a *department* (or type SKIP).' },
    { key: 'locations', prompt: 'Any business *locations*? (or SKIP)' },
    {
      key: 'reporting_structure',
      prompt: 'Describe *reporting structure* briefly (or SKIP)',
    },
    {
      key: 'department_hierarchy',
      prompt: 'Any *department hierarchy* notes? (or SKIP)',
    },
    {
      key: 'department_ownership',
      prompt: 'Who *owns* which department? (or SKIP)',
    },
  ],
  MANAGER_DISCOVERY: [
    { key: 'name', prompt: 'Manager *name*?' },
    { key: 'phone', prompt: 'Manager *phone number*?' },
    { key: 'department', prompt: 'Which *department* do they manage?' },
    { key: 'reporting_role', prompt: 'Their *reporting role*? (or SKIP)' },
  ],
  WORKFORCE_DISCOVERY: [
    { key: 'name', prompt: 'Worker *name*?' },
    { key: 'phone', prompt: 'Worker *phone number*?' },
    { key: 'department', prompt: 'Which *department*?' },
    { key: 'role', prompt: 'Their *role*? (or SKIP)' },
  ],
  INVENTORY_DISCOVERY: [
    { key: 'categories', prompt: 'Main inventory *categories*? (or SKIP)' },
    { key: 'locations', prompt: 'Storage *locations*? (or SKIP)' },
    { key: 'items', prompt: 'Key *items* you stock? (or SKIP)' },
    { key: 'units', prompt: 'Common *units* (pcs, kg, etc.)? (or SKIP)' },
    { key: 'item_types', prompt: 'Any *item types* to note? (or SKIP)' },
  ],
  VENDOR_DISCOVERY: [
    { key: 'vendor_name', prompt: 'Vendor *name*? (or SKIP)' },
    { key: 'vendor_phone', prompt: 'Vendor *phone*? (or SKIP)' },
    { key: 'vendor_category', prompt: 'Vendor *category*? (or SKIP)' },
    { key: 'vendor_location', prompt: 'Vendor *location*? (or SKIP)' },
    {
      key: 'vendor_relationship',
      prompt: 'Notes on vendor *relationship*? (or SKIP)',
    },
  ],
};

export function bucketFieldKeys(bucket: ActiveDiscoveryBucket): string[] {
  return BUCKET_FIELD_DEFINITIONS[bucket].map((f) => f.key);
}

export function entityStorageKey(
  bucket: ActiveDiscoveryBucket,
  entityIndex: number,
  fieldKey: string,
): string {
  return `${bucket}.entry_${entityIndex}.${fieldKey}`;
}

export function resumePromptLabel(
  bucket: ActiveDiscoveryBucket,
  entityIndex: number,
  fieldIndex: number,
): string {
  const label = DISCOVERY_BUCKET_LABELS[bucket];
  if (REPEATABLE_DISCOVERY_BUCKETS.includes(bucket)) {
    const role = bucket === 'MANAGER_DISCOVERY' ? 'Manager' : 'Worker';
    return `${label} — ${role} #${entityIndex + 1}, step ${fieldIndex + 1}`;
  }
  return `${label} — step ${fieldIndex + 1}`;
}

export function listActiveBucketMenuLines(): string {
  return ACTIVE_DISCOVERY_BUCKET_ORDER.map(
    (b, i) => `${i + 1}. ${DISCOVERY_BUCKET_LABELS[b]}`,
  ).join('\n');
}
