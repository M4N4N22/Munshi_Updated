import { parseWhatsAppInbound } from './whatsapp-inbound.parser';
import { WA_INTERACTIVE_ID } from 'src/core/messaging/whatsapp-interactive.constants';

describe('parseWhatsAppInbound', () => {
  it('parses text messages', () => {
    expect(
      parseWhatsAppInbound({
        data: { type: 'text', from: '919999999999', text: 'hello' },
      }),
    ).toEqual({ from: '919999999999', message: 'hello' });
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
      from: '919999999999',
      message: WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
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

  it('returns null for unsupported payloads', () => {
    expect(parseWhatsAppInbound({})).toBeNull();
    expect(parseWhatsAppInbound({ data: { type: 'image' } })).toBeNull();
  });
});
