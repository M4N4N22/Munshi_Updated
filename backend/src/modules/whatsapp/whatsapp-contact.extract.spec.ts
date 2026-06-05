import {
  buildContactShareNoPhoneMessage,
  extractPhoneFromContactsData,
  isContactShareNoPhoneMessage,
  parseContactsInbound,
} from './whatsapp-contact.extract';

describe('whatsapp-contact.extract', () => {
  it('reads wa_id from contacts array', () => {
    expect(
      extractPhoneFromContactsData({
        type: 'contacts',
        contacts: [
          {
            phones: [{ wa_id: '919876543210', phone: '+91 98765 43210' }],
          },
        ],
      }),
    ).toBe('919876543210');
  });

  it('falls back to phone field', () => {
    expect(
      extractPhoneFromContactsData({
        contacts: [{ phones: [{ phone: '+1 724-757-7182' }] }],
      }),
    ).toBe('+1 724-757-7182');
  });

  it('handles GetOlli contacts webhook with only display name in text', () => {
    const olliPayload = {
      event: 'message',
      data: {
        message_id: 'wamid.test',
        from: '918874369725',
        type: 'contacts',
        text: 'Mayank',
        media: null,
      },
    };

    const parsed = parseContactsInbound(
      olliPayload.data as Record<string, unknown>,
      olliPayload as Record<string, unknown>,
    );
    expect(parsed.kind).toBe('no_phone');
    if (parsed.kind === 'no_phone') {
      expect(parsed.displayName).toBe('Mayank');
    }
  });

  it('builds sentinel for workflow nudge', () => {
    const msg = buildContactShareNoPhoneMessage('Mayank');
    expect(isContactShareNoPhoneMessage(msg)).toBe(true);
    expect(msg).toContain('Mayank');
  });

  it('returns null when no phones', () => {
    expect(extractPhoneFromContactsData({ type: 'contacts', contacts: [] })).toBeNull();
  });

  it('does not treat webhook timestamp as phone', () => {
    expect(
      extractPhoneFromContactsData({
        type: 'contacts',
        from: '918874369725',
        text: 'Mayank',
        timestamp: '1780546230',
      }),
    ).toBeNull();
  });
});
