import {
  BusinessDiscoveryStatus,
  ActiveDiscoveryBucket,
} from './business-discovery.constants';
import { DiscoverySourceType } from './business-discovery.fields';

export interface IBusinessDiscoveryProfileRecord {
  id: number;
  factory_id: number;
  status: BusinessDiscoveryStatus;
  identity_completion: number;
  /** ORGANIZATION_STRUCTURE bucket */
  organization_completion: number;
  manager_completion: number;
  workforce_completion: number;
  inventory_completion: number;
  vendor_completion: number;
  overall_completion: number;
  bucket_data: Record<string, unknown>;
  reminder_stage: number;
  last_activity_at: Date | null;
  next_reminder_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IBucketProgress {
  bucket: ActiveDiscoveryBucket;
  label: string;
  completion: number;
  fields: string[];
  source_types_supported: DiscoverySourceType[];
}

export interface IBusinessReadinessScore {
  identity: number;
  organization_structure: number;
  managers: number;
  workforce: number;
  inventory: number;
  vendors: number;
  overall: number;
  status: BusinessDiscoveryStatus;
  /** @deprecated alias for organization_structure */
  organization?: number;
}

export interface IDiscoveryProgressResponse {
  factory_id: number;
  profile: IBusinessDiscoveryProfileRecord;
  readiness: IBusinessReadinessScore;
  buckets: IBucketProgress[];
  resumable: boolean;
}

export interface IDiscoveredManagerEntry {
  name?: string;
  phone?: string;
  department?: string;
  reporting_role?: string;
  source_type?: DiscoverySourceType;
}

export interface IDiscoveredWorkerEntry {
  name?: string;
  phone?: string;
  department?: string;
  role?: string;
  source_type?: DiscoverySourceType;
}

export interface IDiscoveredVendorEntry {
  vendor_name?: string;
  vendor_phone?: string;
  vendor_category?: string;
  vendor_location?: string;
  vendor_relationship?: string;
  source_type?: DiscoverySourceType;
}
