import { parseWhatsAppInbound } from './whatsapp-inbound.parser';
import { WA_INTERACTIVE_ID } from 'src/core/messaging/whatsapp-interactive.constants';
import { buildPurchaseRequestCreateCommand } from 'src/services/purchase-requests/purchase-request-prefill.helper';
import { WA_LOW_STOCK_PURCHASE_BUTTON_TITLE } from 'src/core/messaging/inventory-low-stock-outbound';

describe('parseWhatsAppInbound', () => {
  it('parses text messages', () => {
    expect(
      parseWhatsAppInbound({
        data: { type: 'text', from: '919999999999', text: 'hello' },
      }),
    ).toEqual({ kind: 'text', from: '919999999999', message: 'hello' });
  });

  it('normalizes +91 inbound phone to digits-only 91XXXXXXXXXX', () => {
    expect(
      parseWhatsAppInbound({
        data: { type: 'text', from: '+918874369725', text: 'START' },
      }),
    ).toEqual({ kind: 'text', from: '918874369725', message: 'START' });
  });

  it('does not replace plain text with webhook metadata timestamps', () => {
    expect(
      parseWhatsAppInbound({
        event: 'message',
        data: {
          type: 'text',
          from: '918874369725',
          text: 'production',
          timestamp: '1780546230',
        },
      }),
    ).toEqual({
      kind: 'text',
      from: '918874369725',
      message: 'production',
    });
  });

  it('parses interactive button_reply', () => {
    expect(
      parseWhatsAppInbound({
        data: {
          type: 'interactive',
          from: '919999999999',
          interactive: {
            type: 'button_reply',
            button_reply: {
              id: WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
              title: 'WhatsApp par add',
            },
          },
        },
      }),
    ).toEqual({
      kind: 'text',
      from: '919999999999',
      message: WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
    });
  });

  it('prefers button_reply.id over data.text for low-stock purchase CTA (scenario C)', () => {
    const command = buildPurchaseRequestCreateCommand(42);
    expect(
      parseWhatsAppInbound({
        event: 'message',
        data: {
          type: 'interactive',
          from: '918604856137',
          text: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
          interactive: {
            type: 'button_reply',
            button_reply: {
              id: command,
              title: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
            },
          },
        },
      }),
    ).toEqual({
      kind: 'text',
      from: '918604856137',
      message: command,
    });
  });

  it('parses low-stock purchase button_reply.id only (scenario A)', () => {
    const command = buildPurchaseRequestCreateCommand(99);
    expect(
      parseWhatsAppInbound({
        data: {
          type: 'interactive',
          from: '919456157007',
          interactive: {
            type: 'button_reply',
            button_reply: {
              id: command,
              title: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
            },
          },
        },
      }),
    ).toEqual({
      kind: 'text',
      from: '919456157007',
      message: command,
    });
  });

  it('parses GetOlli interactive taps (title in data.text)', () => {
    expect(
      parseWhatsAppInbound({
        event: 'message',
        data: {
          type: 'interactive',
          from: '918874369725',
          text: 'Google Form se add',
        },
      }),
    ).toEqual({
      kind: 'text',
      from: '918874369725',
      message: WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM,
    });
  });

  it('ignores status webhooks', () => {
    expect(
      parseWhatsAppInbound({
        event: 'status',
        data: { status: 'delivered' },
      }),
    ).toBeNull();
  });

  it('parses document messages', () => {
    expect(
      parseWhatsAppInbound({
        data: { type: 'document', from: '919999999999', document: {
            id: 'doc-123',
            filename: 'team.csv',
          },
        },
      }),
    ).toEqual({
      kind: 'document',
      from: '919999999999',
      media: {
        mediaId: 'doc-123',
        filename: 'team.csv',
      },
    });
  });

  it('parses GetOlli document with data.media', () => {
    expect(
      parseWhatsAppInbound({
        event: 'message',
        data: {
          message_id: 'wamid.HBgMTEST',
          from: '918874369725',
          type: 'document',
          media: {
            id: 'media-789',
            filename: 'munshi-team-template.csv',
          },
        },
      }),
    ).toEqual({
      kind: 'document',
      from: '918874369725',
      media: {
        mediaId: 'media-789',
        filename: 'munshi-team-template.csv',
      },
    });
  });

  it('parses shared contact as phone text', () => {
    expect(
      parseWhatsAppInbound({
        event: 'message',
        data: {
          type: 'contacts',
          from: '919999999999',
          contacts: [
            { phones: [{ wa_id: '918765432109' }] },
          ],
        },
      }),
    ).toEqual({
      kind: 'text',
      from: '919999999999',
      message: '918765432109',
    });
  });

  it('parses GetOlli contact share without phone as nudge message', () => {
    const result = parseWhatsAppInbound({
      event: 'message',
      data: {
        from: '918874369725',
        type: 'contacts',
        text: 'Mayank',
        media: null,
      },
    });
    expect(result?.kind).toBe('text');
    if (result?.kind === 'text') {
      expect(result.message).toContain('__MUNSHI_CONTACT_NO_PHONE__');
      expect(result.message).toContain('Mayank');
    }
  });

  it('returns null for unsupported payloads', () => {
    expect(parseWhatsAppInbound({})).toBeNull();
    expect(parseWhatsAppInbound({ data: { type: 'image', from: '91' } })).toBeNull();
  });
});
