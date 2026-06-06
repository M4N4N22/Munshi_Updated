import { Injectable, Logger } from '@nestjs/common';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { DomainEvent } from 'src/services/domain-events/domain-events.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { buildIntegrationSyncFailedAlertText } from 'src/modules/whatsapp/whatsapp.templates';
import {
  formatSyncFailedDirectionLabel,
  formatSyncFailedProviderLabel,
} from './integration-sync-failed.publisher';
import { IntegrationSyncFailedPayload } from './integration-sync-failed.helper';

@Injectable()
export class IntegrationSyncFailedAlertHandler {
  private readonly logger = new Logger(IntegrationSyncFailedAlertHandler.name);

  constructor(
    private readonly dbService: DbService,
    private readonly messagingService: MessagingService,
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = (event.payload ?? {}) as Partial<IntegrationSyncFailedPayload>;
    const factoryId = Number(payload.factory_id ?? event.factory_id);
    if (!factoryId || !Number.isFinite(factoryId)) {
      this.logger.warn(`Domain event ${event.id} missing factory_id`);
      return;
    }

    const ownerPhone = await this.resolveOwnerPhone(factoryId);
    if (!ownerPhone) {
      this.logger.warn(
        `Factory #${factoryId} has no owner phone — skipping sync failure alert for event ${event.id}`,
      );
      return;
    }

    const provider = formatSyncFailedProviderLabel(
      String(payload.provider ?? 'integration'),
    );
    const direction = formatSyncFailedDirectionLabel(
      payload.direction === 'push' ? 'push' : 'pull',
    );
    const errorSummary = String(payload.error_summary ?? 'Unknown error').trim();

    const text = buildIntegrationSyncFailedAlertText({
      provider,
      direction,
      errorSummary,
    });

    await this.messagingService.sendText(ownerPhone, text);
  }

  private async resolveOwnerPhone(factoryId: number): Promise<string | null> {
    const ownerLink = await this.dbService.sqlService.FactoryUser.findOne({
      where: { factory_id: factoryId, role: USER_ROLE.OWNER },
      order: [['id', 'ASC']],
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['phone_number'],
        },
      ],
    });
    const phone = (ownerLink as any)?.user?.phone_number as string | undefined;
    return phone?.trim() ? phone.trim() : null;
  }
}
