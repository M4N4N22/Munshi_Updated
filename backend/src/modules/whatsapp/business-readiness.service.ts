import { Injectable } from '@nestjs/common';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { FactoryService } from 'src/services/factories/factories.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import type { BusinessReadinessSnapshot } from 'src/core/messaging/owner-home-outbound';

type MemberRow = { role?: string };

@Injectable()
export class BusinessReadinessService {
  constructor(
    private readonly factoryService: FactoryService,
    private readonly inventoryService: InventoryService,
    private readonly messagingService: MessagingService,
  ) {}

  async getSnapshot(businessId: number): Promise<BusinessReadinessSnapshot> {
    const businessName = await this.messagingService.getBusinessDisplayName(
      businessId,
    );
    const members = (await this.factoryService.getFactoryUsers(
      businessId,
    )) as MemberRow[];

    const employeeCount = members.filter((m) => {
      const role = (m.role || '').toUpperCase();
      return role === USER_ROLE.WORKER || role === USER_ROLE.MANAGER;
    }).length;

    const stock = await this.inventoryService.listItems(businessId, {
      page: 1,
      page_size: 1,
      activeOnly: true,
    });

    return {
      businessName,
      employeeCount,
      stockItemCount: stock.meta.total,
      hasEmployees: employeeCount > 0,
    };
  }
}
