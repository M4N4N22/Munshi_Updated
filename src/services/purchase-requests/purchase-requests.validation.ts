import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { FactoryUser } from 'src/services/factories/factories.schema';
import { USER_ROLE } from 'src/services/users/users.constants';
import {
  PURCHASE_REQUEST_AUDIT_EVENT,
  PURCHASE_REQUEST_STATUS,
  PurchaseRequestStatus,
} from './purchase-requests.constants';

export function assertFactoryId(factoryId: number): void {
  if (!Number.isFinite(factoryId) || factoryId <= 0) {
    throw new BadRequestException('factory_id must be a positive number');
  }
}

export function assertPositiveUserId(userId: number, label = 'user id'): void {
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestException(`${label} must be a positive number`);
  }
}

export function normalizeQuantity(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException('requested_quantity must be a positive number');
  }
  return String(n);
}

export function canApprovePurchaseRequests(role: string): boolean {
  return role === USER_ROLE.OWNER || role === USER_ROLE.MANAGER;
}

@Injectable()
export class PurchaseRequestValidationService {
  private readonly factoryUserModel: typeof FactoryUser;

  constructor(private readonly dbService: DbService) {
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

  async assertFactoryMember(
    factoryId: number,
    userId: number,
  ): Promise<{ role: string }> {
    assertFactoryId(factoryId);
    assertPositiveUserId(userId, 'performed_by');
    const link = await this.factoryUserModel.findOne({
      where: { factory_id: factoryId, user_id: userId },
    });
    if (!link) {
      throw new ForbiddenException(
        `User #${userId} is not a member of factory #${factoryId}`,
      );
    }
    return { role: link.role };
  }

  async assertCanApprove(factoryId: number, userId: number): Promise<void> {
    const { role } = await this.assertFactoryMember(factoryId, userId);
    if (!canApprovePurchaseRequests(role)) {
      throw new ForbiddenException(
        'Only owners or managers can approve or reject purchase requests',
      );
    }
  }

  assertStatusTransition(
    current: PurchaseRequestStatus,
    next: PurchaseRequestStatus,
  ): void {
    const allowed: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
      [PURCHASE_REQUEST_STATUS.DRAFT]: [
        PURCHASE_REQUEST_STATUS.PENDING_APPROVAL,
      ],
      [PURCHASE_REQUEST_STATUS.PENDING_APPROVAL]: [
        PURCHASE_REQUEST_STATUS.APPROVED,
        PURCHASE_REQUEST_STATUS.REJECTED,
      ],
      [PURCHASE_REQUEST_STATUS.APPROVED]: [
        PURCHASE_REQUEST_STATUS.ASSIGNED_TO_VENDOR,
        PURCHASE_REQUEST_STATUS.CLOSED,
      ],
      [PURCHASE_REQUEST_STATUS.ASSIGNED_TO_VENDOR]: [
        PURCHASE_REQUEST_STATUS.CLOSED,
        PURCHASE_REQUEST_STATUS.APPROVED,
      ],
      [PURCHASE_REQUEST_STATUS.REJECTED]: [],
      [PURCHASE_REQUEST_STATUS.CLOSED]: [],
    };

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(
        `Cannot transition purchase request from ${current} to ${next}`,
      );
    }
  }
}

export function buildRequestNumber(
  factoryId: number,
  id: number,
  date = new Date(),
): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `PR-${factoryId}-${y}${m}${d}-${id}`;
}

export function isYes(input: string): boolean {
  const v = input.trim().toLowerCase();
  return ['yes', 'y', 'ha', 'haan', 'approve', 'ok'].includes(v);
}

export function isNo(input: string): boolean {
  const v = input.trim().toLowerCase();
  return ['no', 'n', 'nahi', 'reject', 'cancel'].includes(v);
}

export const AUDIT_EVENT = PURCHASE_REQUEST_AUDIT_EVENT;
