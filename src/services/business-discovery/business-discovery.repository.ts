import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { BusinessDiscoveryProfile } from './business-discovery.schema';

@Injectable()
export class BusinessDiscoveryRepository {
  readonly model: typeof BusinessDiscoveryProfile;

  constructor(private readonly dbService: DbService) {
    this.model = this.dbService.sqlService.BusinessDiscoveryProfile;
  }

  findByFactoryId(factoryId: number): Promise<BusinessDiscoveryProfile | null> {
    return this.model.findOne({ where: { factory_id: factoryId } });
  }

  create(
    data: Partial<BusinessDiscoveryProfile>,
  ): Promise<BusinessDiscoveryProfile> {
    return this.model.create(data as any);
  }

  async save(row: BusinessDiscoveryProfile): Promise<BusinessDiscoveryProfile> {
    await row.save();
    return row;
  }

  findDueReminders(now: Date): Promise<BusinessDiscoveryProfile[]> {
    return this.model.findAll({
      where: {
        status: 'ACTIVE',
      },
    }).then((rows) =>
      rows.filter(
        (r) =>
          r.next_reminder_at != null &&
          r.next_reminder_at <= now &&
          (r.reminder_stage ?? 0) < 3,
      ),
    );
  }
}
