import { Injectable, Logger } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';

export type WebhookDedupClaimInput = {
  providerMessageId: string;
  eventKind: 'text' | 'document' | 'unknown';
  fromPhone?: string;
};

@Injectable()
export class WhatsAppWebhookDedupService {
  private readonly logger = new Logger(WhatsAppWebhookDedupService.name);

  constructor(private readonly dbService: DbService) {}

  /**
   * Returns true when this webhook should be processed (first delivery).
   * Returns false when the provider message id was already claimed.
   */
  async tryClaim(input: WebhookDedupClaimInput): Promise<boolean> {
    const id = input.providerMessageId.trim();
    if (!id) {
      return true;
    }

    try {
      const [, created] =
        await this.dbService.sqlService.WhatsAppWebhookEvent.findOrCreate({
          where: { provider_message_id: id },
          defaults: {
            provider_message_id: id,
            event_kind: input.eventKind,
            from_phone: input.fromPhone ?? null,
            processed_at: new Date(),
          },
        });

      if (!created) {
        this.logger.log({
          event: 'whatsapp_webhook_duplicate_skipped',
          providerMessageId: id,
          eventKind: input.eventKind,
          fromPhone: input.fromPhone,
        });
        return false;
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('unique')) {
        this.logger.log({
          event: 'whatsapp_webhook_duplicate_skipped',
          providerMessageId: id,
          eventKind: input.eventKind,
          fromPhone: input.fromPhone,
          reason: 'unique_violation',
        });
        return false;
      }
      throw err;
    }
  }
}
