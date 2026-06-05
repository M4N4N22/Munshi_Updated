import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { FactoryUser } from 'src/services/factories/factories.schema';
import { USER_ROLE } from 'src/services/users/users.constants';

export function assertFactoryId(factoryId: number): void {
  if (!Number.isFinite(factoryId) || factoryId <= 0) {
    throw new BadRequestException('factory_id must be a positive number');
  }
}

export function assertPositiveUserId(userId: number, label = 'user_id'): void {
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestException(`${label} must be a positive number`);
  }
}

export function canManageIntegrations(role: string): boolean {
  return role === USER_ROLE.OWNER || role === USER_ROLE.MANAGER;
}

@Injectable()
export class IntegrationAuthValidationService {
  private readonly factoryUserModel: typeof FactoryUser;

  constructor(private readonly dbService: DbService) {
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

  async assertCanManageIntegrations(
    factoryId: number,
    userId: number,
  ): Promise<{ role: string }> {
    assertFactoryId(factoryId);
    assertPositiveUserId(userId);
    const link = await this.factoryUserModel.findOne({
      where: { factory_id: factoryId, user_id: userId },
    });
    if (!link) {
      throw new ForbiddenException(
        `User #${userId} is not a member of factory #${factoryId}`,
      );
    }
    if (!canManageIntegrations(link.role)) {
      throw new ForbiddenException(
        'Only owners or managers can manage integrations',
      );
    }
    return { role: link.role };
  }
}
