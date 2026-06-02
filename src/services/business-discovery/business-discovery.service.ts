import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import {
  BUSINESS_DISCOVERY_STATUS,
  DISCOVERY_BUCKET,
  DISCOVERY_REMINDER_HOURS,
  DISCOVERY_REMINDER_STAGE,
  ActiveDiscoveryBucket,
  normalizeDiscoveryBucket,
} from './business-discovery.constants';
import {
  DISCOVERY_SOURCE_TYPE,
  DiscoverySourceType,
  entityStorageKey,
} from './business-discovery.fields';
import { sanitizeBucketData } from './business-discovery.hygiene';
import {
  IBusinessDiscoveryProfileRecord,
  IBusinessReadinessScore,
  IDiscoveryProgressResponse,
} from './business-discovery.interfaces';
import { BusinessDiscoveryRepository } from './business-discovery.repository';
import { BusinessDiscoveryProfile } from './business-discovery.schema';
import {
  buildBucketProgress,
  computeBucketScores,
  mergeBucketDataField,
} from './business-discovery.scoring';

@Injectable()
export class BusinessDiscoveryService {
  constructor(
    private readonly repository: BusinessDiscoveryRepository,
    private readonly dbService: DbService,
  ) {}

  async getOrCreateProfile(
    factoryId: number,
  ): Promise<BusinessDiscoveryProfile> {
    let profile = await this.repository.findByFactoryId(factoryId);
    if (!profile) {
      const now = new Date();
      profile = await this.repository.create({
        factory_id: factoryId,
        status: BUSINESS_DISCOVERY_STATUS.ACTIVE,
        last_activity_at: now,
        next_reminder_at: this.scheduleFirstReminder(now),
        bucket_data: {},
      });
    }
    return profile;
  }

  async getProfile(factoryId: number): Promise<IBusinessDiscoveryProfileRecord> {
    const profile = await this.getOrCreateProfile(factoryId);
    await this.refreshScores(profile);
    return this.toRecord(profile);
  }

  async getProgress(factoryId: number): Promise<IDiscoveryProgressResponse> {
    const profile = await this.getOrCreateProfile(factoryId);
    await this.refreshScores(profile);
    const readiness = this.readinessFromProfile(profile);
    return {
      factory_id: factoryId,
      profile: this.toRecord(profile),
      readiness,
      buckets: buildBucketProgress(readiness),
      resumable: profile.status !== BUSINESS_DISCOVERY_STATUS.COMPLETED,
    };
  }

  async getReadiness(factoryId: number): Promise<{
    factory_id: number;
    readiness: IBusinessReadinessScore;
    buckets: ReturnType<typeof buildBucketProgress>;
  }> {
    const progress = await this.getProgress(factoryId);
    return {
      factory_id: factoryId,
      readiness: progress.readiness,
      buckets: progress.buckets,
    };
  }

  listBuckets() {
    return buildBucketProgress({
      identity: 0,
      organization_structure: 0,
      managers: 0,
      workforce: 0,
      inventory: 0,
      vendors: 0,
      overall: 0,
      status: BUSINESS_DISCOVERY_STATUS.ACTIVE,
    });
  }

  async pause(factoryId: number): Promise<IBusinessDiscoveryProfileRecord> {
    const profile = await this.getOrCreateProfile(factoryId);
    profile.status = BUSINESS_DISCOVERY_STATUS.PAUSED;
    profile.next_reminder_at = null;
    profile.reminder_stage = DISCOVERY_REMINDER_STAGE.PAUSED;
    await this.touchActivity(profile, false);
    return this.toRecord(profile);
  }

  async resume(factoryId: number): Promise<IBusinessDiscoveryProfileRecord> {
    const profile = await this.getOrCreateProfile(factoryId);
    profile.status = BUSINESS_DISCOVERY_STATUS.ACTIVE;
    profile.reminder_stage = DISCOVERY_REMINDER_STAGE.NONE;
    await this.touchActivity(profile, true);
    return this.toRecord(profile);
  }

  async processReminder(factoryId: number): Promise<{
    sent: boolean;
    stage: number;
    message: string;
  }> {
    const profile = await this.getOrCreateProfile(factoryId);
    if (profile.status !== BUSINESS_DISCOVERY_STATUS.ACTIVE) {
      return { sent: false, stage: profile.reminder_stage ?? 0, message: 'Not active' };
    }
    const now = new Date();
    if (profile.next_reminder_at && profile.next_reminder_at > now) {
      return { sent: false, stage: profile.reminder_stage ?? 0, message: 'Not due yet' };
    }

    const stage = profile.reminder_stage ?? 0;
    if (stage >= DISCOVERY_REMINDER_STAGE.PAUSED) {
      return { sent: false, stage, message: 'Reminders exhausted' };
    }

    if (stage === DISCOVERY_REMINDER_STAGE.NONE) {
      profile.reminder_stage = DISCOVERY_REMINDER_STAGE.FIRST_SENT;
      profile.next_reminder_at = new Date(
        now.getTime() + DISCOVERY_REMINDER_HOURS.FINAL * 60 * 60 * 1000,
      );
      await this.repository.save(profile);
      return {
        sent: true,
        stage: profile.reminder_stage,
        message:
          'Reminder: you can continue telling Munshi about your business anytime. Send /business_discovery or say "continue setup".',
      };
    }

    if (stage === DISCOVERY_REMINDER_STAGE.FIRST_SENT) {
      profile.reminder_stage = DISCOVERY_REMINDER_STAGE.FINAL_SENT;
      profile.next_reminder_at = null;
      await this.repository.save(profile);
      return {
        sent: true,
        stage: profile.reminder_stage,
        message:
          'Final reminder: your business discovery is paused until you continue. Munshi remains fully usable.',
      };
    }

    profile.status = BUSINESS_DISCOVERY_STATUS.PAUSED;
    profile.reminder_stage = DISCOVERY_REMINDER_STAGE.PAUSED;
    profile.next_reminder_at = null;
    await this.repository.save(profile);
    return {
      sent: true,
      stage: profile.reminder_stage,
      message: 'Discovery paused after reminders. Resume anytime with /business_discovery.',
    };
  }

  async recordBucketField(
    factoryId: number,
    bucket: ActiveDiscoveryBucket | string,
    field: string,
    value: unknown,
    options?: {
      sourceType?: DiscoverySourceType;
      entityIndex?: number;
    },
  ): Promise<IBusinessDiscoveryProfileRecord> {
    const normalized = normalizeDiscoveryBucket(String(bucket));
    if (!normalized) {
      throw new Error(`Unknown discovery bucket: ${bucket}`);
    }

    const profile = await this.getOrCreateProfile(factoryId);
    const sourceType = options?.sourceType ?? DISCOVERY_SOURCE_TYPE.CHAT;
    const entityIndex = options?.entityIndex ?? 0;

    const storageKey =
      options?.entityIndex != null
        ? entityStorageKey(normalized, entityIndex, field)
        : `${normalized}.${field}`;

    const merged = mergeBucketDataField(
      sanitizeBucketData((profile.bucket_data ?? {}) as Record<string, unknown>),
      storageKey,
      value ?? true,
      sourceType,
    );
    profile.bucket_data = sanitizeBucketData(merged);
    await this.applyIdentityToFactory(factoryId, normalized, field, value);
    await this.touchActivity(profile, true);
    await this.refreshScores(profile);
    return this.toRecord(profile);
  }

  async recordDocumentBucketField(
    factoryId: number,
    bucket: ActiveDiscoveryBucket,
    field: string,
    value: unknown,
  ): Promise<IBusinessDiscoveryProfileRecord> {
    return this.recordBucketField(factoryId, bucket, field, value, {
      sourceType: DISCOVERY_SOURCE_TYPE.DOCUMENT,
    });
  }

  async bumpBucketCompletion(
    factoryId: number,
    bucket: ActiveDiscoveryBucket,
    increment: number,
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(factoryId);
    const key = `${bucket}_document_boost`;
    const data = sanitizeBucketData((profile.bucket_data ?? {}) as Record<string, unknown>);
    const current = Number(data[key] ?? 0);
    data[key] = Math.min(100, current + increment);
    profile.bucket_data = data;
    await this.touchActivity(profile, true);
    await this.refreshScores(profile);
  }

  async markCompletedIfReady(factoryId: number): Promise<void> {
    const profile = await this.getOrCreateProfile(factoryId);
    if (profile.overall_completion >= 100) {
      profile.status = BUSINESS_DISCOVERY_STATUS.COMPLETED;
      profile.next_reminder_at = null;
      await this.repository.save(profile);
    }
  }

  async processDueReminders(): Promise<number> {
    const due = await this.repository.findDueReminders(new Date());
    let count = 0;
    for (const row of due) {
      await this.processReminder(row.factory_id);
      count++;
    }
    return count;
  }

  /** Remove operational pollution from profile bucket_data (production-safe, factory-scoped). */
  async sanitizeProfileData(
    factoryId: number,
  ): Promise<IBusinessDiscoveryProfileRecord> {
    const profile = await this.getOrCreateProfile(factoryId);
    profile.bucket_data = sanitizeBucketData(
      (profile.bucket_data ?? {}) as Record<string, unknown>,
    );
    await this.refreshScores(profile);
    return this.toRecord(profile);
  }

  private async applyIdentityToFactory(
    factoryId: number,
    bucket: ActiveDiscoveryBucket,
    field: string,
    value: unknown,
  ): Promise<void> {
    if (bucket !== DISCOVERY_BUCKET.BUSINESS_IDENTITY || value == null) return;
    const Factory = this.dbService.sqlService.Factory;
    const factory = await Factory.findByPk(factoryId);
    if (!factory) return;
    const patch: Record<string, string> = {};
    if (field === 'business_name' || field === 'name') patch.name = String(value);
    if (field === 'address') patch.address = String(value);
    if (Object.keys(patch).length) {
      await factory.update(patch as any);
    }
  }

  private async gatherSignals(factoryId: number, profile: BusinessDiscoveryProfile) {
    const Factory = this.dbService.sqlService.Factory;
    const Department = this.dbService.sqlService.Department;
    const FactoryUser = this.dbService.sqlService.FactoryUser;
    const InventoryCategory = this.dbService.sqlService.InventoryCategory;
    const InventoryLocation = this.dbService.sqlService.InventoryLocation;
    const InventoryItem = this.dbService.sqlService.InventoryItem;
    const Vendor = this.dbService.sqlService.Vendor;

    const factory = await Factory.findByPk(factoryId);
    const departments = await Department.count({ where: { factory_id: factoryId } });
    const members = await FactoryUser.findAll({ where: { factory_id: factoryId } });
    const managers = members.filter((m) =>
      ['OWNER', 'MANAGER'].includes(String(m.role)),
    ).length;
    const workers = members.filter((m) => String(m.role) === 'WORKER').length;
    const categories = await InventoryCategory.count({
      where: { factory_id: factoryId },
    });
    const locations = await InventoryLocation.count({
      where: { factory_id: factoryId },
    });
    const items = await InventoryItem.count({ where: { factory_id: factoryId } });
    const vendors = await Vendor.count({
      where: { factory_id: factoryId, is_active: true },
    });

    const data = sanitizeBucketData((profile.bucket_data ?? {}) as Record<string, unknown>);

    return {
      factoryName: factory?.name ?? null,
      factoryAddress: factory?.address ?? null,
      industry: data[`${DISCOVERY_BUCKET.BUSINESS_IDENTITY}.industry`] as string,
      businessType: data[`${DISCOVERY_BUCKET.BUSINESS_IDENTITY}.business_type`] as string,
      departmentCount: departments,
      managerCount: managers,
      workerCount: workers,
      categoryCount: categories,
      locationCount: locations,
      itemCount: items,
      vendorCount: vendors,
      bucketData: data,
    };
  }

  private async refreshScores(profile: BusinessDiscoveryProfile): Promise<void> {
    const signals = await this.gatherSignals(profile.factory_id, profile);
    const scores = computeBucketScores(signals);
    profile.identity_completion = scores.identity;
    profile.organization_completion = scores.organization_structure;
    profile.manager_completion = scores.managers;
    profile.workforce_completion = scores.workforce;
    profile.inventory_completion = scores.inventory;
    profile.vendor_completion = scores.vendors;
    profile.overall_completion = scores.overall;
    if (
      scores.overall >= 100 &&
      profile.status === BUSINESS_DISCOVERY_STATUS.ACTIVE
    ) {
      profile.status = BUSINESS_DISCOVERY_STATUS.COMPLETED;
      profile.next_reminder_at = null;
    }
    await this.repository.save(profile);
  }

  private async touchActivity(
    profile: BusinessDiscoveryProfile,
    resetReminder: boolean,
  ): Promise<void> {
    const now = new Date();
    profile.last_activity_at = now;
    if (resetReminder && profile.status === BUSINESS_DISCOVERY_STATUS.ACTIVE) {
      profile.reminder_stage = DISCOVERY_REMINDER_STAGE.NONE;
      profile.next_reminder_at = this.scheduleFirstReminder(now);
    }
    await this.repository.save(profile);
  }

  private scheduleFirstReminder(from: Date): Date {
    return new Date(
      from.getTime() + DISCOVERY_REMINDER_HOURS.FIRST * 60 * 60 * 1000,
    );
  }

  private readinessFromProfile(
    profile: BusinessDiscoveryProfile,
  ): IBusinessReadinessScore {
    return {
      identity: profile.identity_completion ?? 0,
      organization_structure: profile.organization_completion ?? 0,
      managers: profile.manager_completion ?? 0,
      workforce: profile.workforce_completion ?? 0,
      inventory: profile.inventory_completion ?? 0,
      vendors: profile.vendor_completion ?? 0,
      overall: profile.overall_completion ?? 0,
      status: profile.status as any,
      organization: profile.organization_completion ?? 0,
    };
  }

  private toRecord(row: BusinessDiscoveryProfile): IBusinessDiscoveryProfileRecord {
    return {
      id: row.id,
      factory_id: row.factory_id,
      status: row.status as any,
      identity_completion: row.identity_completion ?? 0,
      organization_completion: row.organization_completion ?? 0,
      manager_completion: row.manager_completion ?? 0,
      workforce_completion: row.workforce_completion ?? 0,
      inventory_completion: row.inventory_completion ?? 0,
      vendor_completion: row.vendor_completion ?? 0,
      overall_completion: row.overall_completion ?? 0,
      bucket_data: sanitizeBucketData((row.bucket_data ?? {}) as Record<string, unknown>),
      reminder_stage: row.reminder_stage ?? 0,
      last_activity_at: row.last_activity_at ?? null,
      next_reminder_at: row.next_reminder_at ?? null,
      created_at: row.createdAt!,
      updated_at: row.updatedAt!,
    };
  }
}
