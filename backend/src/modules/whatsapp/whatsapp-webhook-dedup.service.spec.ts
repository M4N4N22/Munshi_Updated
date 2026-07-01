import { WhatsAppWebhookDedupService } from './whatsapp-webhook-dedup.service';
import type { DbService } from 'src/core/services/db-service/db.service';

describe('WhatsAppWebhookDedupService', () => {
  const findOrCreate = jest.fn();

  const dbService = {
    sqlService: {
      WhatsAppWebhookEvent: { findOrCreate },
    },
  } as unknown as DbService;

  const service = new WhatsAppWebhookDedupService(dbService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claims first delivery', async () => {
    findOrCreate.mockResolvedValue([{ id: 1 }, true]);

    const claimed = await service.tryClaim({
      providerMessageId: 'wamid.1',
      eventKind: 'text',
      fromPhone: '91999',
    });

    expect(claimed).toBe(true);
  });

  it('skips duplicate delivery', async () => {
    findOrCreate.mockResolvedValue([{ id: 1 }, false]);

    const claimed = await service.tryClaim({
      providerMessageId: 'wamid.1',
      eventKind: 'document',
    });

    expect(claimed).toBe(false);
  });
});
