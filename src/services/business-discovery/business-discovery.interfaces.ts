import {
  BusinessDiscoveryStatus,
  DiscoveryBucket,
} from './business-discovery.constants';

export interface IBusinessDiscoveryProfileRecord {
  id: number;
  factory_id: number;
  status: BusinessDiscoveryStatus;
  identity_completion: number;
  organization_completion: number;
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
  bucket: DiscoveryBucket;
  label: string;
  completion: number;
  fields: string[];
}

export interface IBusinessReadinessScore {
  identity: number;
  organization: number;
  inventory: number;
  vendors: number;
  overall: number;
  status: BusinessDiscoveryStatus;
}

export interface IDiscoveryProgressResponse {
  factory_id: number;
  profile: IBusinessDiscoveryProfileRecord;
  readiness: IBusinessReadinessScore;
  buckets: IBucketProgress[];
  resumable: boolean;
}
