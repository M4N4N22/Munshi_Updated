import { Injectable } from '@nestjs/common';
import {
  ActiveDiscoveryBucket,
  DISCOVERY_BUCKET,
  normalizeDiscoveryBucket,
} from './business-discovery.constants';
import {
  DISCOVERY_SOURCE_TYPE,
  DiscoverySourceType,
} from './business-discovery.fields';
import {
  IDiscoveredManagerEntry,
  IDiscoveredVendorEntry,
  IDiscoveredWorkerEntry,
} from './business-discovery.interfaces';
import { BusinessDiscoveryService } from './business-discovery.service';

/** Reads discovery bucket_data for consumption by departments, workers, vendors, inventory modules. */
@Injectable()
export class BusinessDiscoveryIntegrationService {
  constructor(private readonly discoveryService: BusinessDiscoveryService) {}

  async getDiscoveredDepartments(factoryId: number): Promise<string[]> {
    const profile = await this.discoveryService.getProfile(factoryId);
    const data = profile.bucket_data;
    const out: string[] = [];
    const keys = [
      `${DISCOVERY_BUCKET.ORGANIZATION_STRUCTURE}.departments`,
      `${DISCOVERY_BUCKET.ORGANIZATION}.departments`,
    ];
    for (const k of keys) {
      const v = data[k];
      if (typeof v === 'string' && v) out.push(v);
    }
    return out;
  }

  async getDiscoveredManagers(
    factoryId: number,
  ): Promise<IDiscoveredManagerEntry[]> {
    return this.parseRepeatableEntries<IDiscoveredManagerEntry>(
      factoryId,
      DISCOVERY_BUCKET.MANAGER_DISCOVERY,
      ['name', 'phone', 'department', 'reporting_role'],
    );
  }

  async getDiscoveredWorkers(
    factoryId: number,
  ): Promise<IDiscoveredWorkerEntry[]> {
    return this.parseRepeatableEntries<IDiscoveredWorkerEntry>(
      factoryId,
      DISCOVERY_BUCKET.WORKFORCE_DISCOVERY,
      ['name', 'phone', 'department', 'role'],
    );
  }

  async getDiscoveredVendors(
    factoryId: number,
  ): Promise<IDiscoveredVendorEntry[]> {
    const profile = await this.discoveryService.getProfile(factoryId);
    const data = profile.bucket_data;
    const entry: IDiscoveredVendorEntry = {};
    const fields = [
      'vendor_name',
      'vendor_phone',
      'vendor_category',
      'vendor_location',
      'vendor_relationship',
    ] as const;
    for (const f of fields) {
      const v = data[`${DISCOVERY_BUCKET.VENDOR_DISCOVERY}.${f}`];
      if (typeof v === 'string') entry[f] = v;
      entry.source_type = this.readSource(
        data,
        `${DISCOVERY_BUCKET.VENDOR_DISCOVERY}.${f}`,
      );
    }
    const legacy = data[`${DISCOVERY_BUCKET.VENDORS}.vendor_list`];
    if (typeof legacy === 'string' && !entry.vendor_name) {
      entry.vendor_name = legacy;
    }
    return Object.keys(entry).length > 1 ? [entry] : [];
  }

  async getDiscoveredInventoryHints(factoryId: number): Promise<{
    categories: string[];
    locations: string[];
    items: string[];
    units: string[];
  }> {
    const profile = await this.discoveryService.getProfile(factoryId);
    const data = profile.bucket_data;
    const bucket = DISCOVERY_BUCKET.INVENTORY_DISCOVERY;
    const read = (field: string) => {
      const v = data[`${bucket}.${field}`] ?? data[`${DISCOVERY_BUCKET.INVENTORY}.${field}`];
      return typeof v === 'string' ? [v] : [];
    };
    return {
      categories: read('categories'),
      locations: read('locations'),
      items: read('items'),
      units: read('units'),
    };
  }

  private async parseRepeatableEntries<T extends object>(
    factoryId: number,
    bucket: ActiveDiscoveryBucket,
    fieldKeys: string[],
  ): Promise<T[]> {
    const profile = await this.discoveryService.getProfile(factoryId);
    const data = profile.bucket_data;
    const entries: T[] = [];
    for (let i = 0; i < 20; i++) {
      const row: Record<string, unknown> = {};
      let hasAny = false;
      for (const key of fieldKeys) {
        const storageKey = `${bucket}.entry_${i}.${key}`;
        const val = data[storageKey];
        if (typeof val === 'string' && val) {
          row[key] = val;
          hasAny = true;
          row.source_type = this.readSource(data, storageKey);
        }
      }
      if (hasAny) entries.push(row as T);
      else if (i > 0) break;
    }
    return entries;
  }

  private readSource(
    data: Record<string, unknown>,
    fieldKey: string,
  ): DiscoverySourceType {
    const src = data[`${fieldKey}__source`];
    return src === DISCOVERY_SOURCE_TYPE.DOCUMENT
      ? DISCOVERY_SOURCE_TYPE.DOCUMENT
      : DISCOVERY_SOURCE_TYPE.CHAT;
  }
}
