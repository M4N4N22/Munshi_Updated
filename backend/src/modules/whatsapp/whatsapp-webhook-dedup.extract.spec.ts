import { extractWebhookDedupeKey } from './whatsapp-webhook-dedup.extract';

describe('extractWebhookDedupeKey', () => {
  it('reads message_id from data', () => {
    expect(
      extractWebhookDedupeKey({
        data: { type: 'text', from: '91999', message_id: 'wamid.ABC' },
      }),
    ).toBe('wamid.ABC');
  });

  it('reads nested document id', () => {
    expect(
      extractWebhookDedupeKey({
        data: {
          type: 'document',
          from: '91999',
          document: { id: 'media-123', filename: 'stock.csv' },
        },
      }),
    ).toBe('media-123');
  });

  it('returns null when no stable id exists', () => {
    expect(
      extractWebhookDedupeKey({
        data: { type: 'text', from: '91999', text: 'hello' },
      }),
    ).toBeNull();
  });
});
