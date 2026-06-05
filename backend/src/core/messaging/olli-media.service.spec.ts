import { OlliMediaService, resolveOlliMediaUrl } from './olli-media.service';

describe('resolveOlliMediaUrl', () => {
  const prevOlli = process.env.OLLI_URL;
  const prevMediaBase = process.env.OLLI_MEDIA_BASE_URL;

  afterEach(() => {
    process.env.OLLI_URL = prevOlli;
    process.env.OLLI_MEDIA_BASE_URL = prevMediaBase;
  });

  it('returns absolute URLs unchanged', () => {
    expect(resolveOlliMediaUrl('https://cdn.example.com/file.csv')).toBe(
      'https://cdn.example.com/file.csv',
    );
  });

  it('resolves GetOlli relative upload paths against OLLI origin', () => {
    process.env.OLLI_URL = 'https://api.getolliai.com/api/v1';
    delete process.env.OLLI_MEDIA_BASE_URL;
    expect(
      resolveOlliMediaUrl(
        '/uploads/waba-media/1780564424254_munshi-team-template.csv',
      ),
    ).toBe(
      'https://api.getolliai.com/uploads/waba-media/1780564424254_munshi-team-template.csv',
    );
  });
});

describe('OlliMediaService.extractMediaFromWebhook', () => {
  const service = new OlliMediaService();

  it('reads document id from data.document (WABA shape)', () => {
    expect(
      service.extractMediaFromWebhook({
        event: 'message',
        data: {
          type: 'document',
          from: '919999999999',
          document: { id: 'doc-123', filename: 'team.csv' },
        },
      }),
    ).toEqual({
      mediaId: 'doc-123',
      url: undefined,
      filename: 'team.csv',
      mimeType: undefined,
    });
  });

  it('reads GetOlli document from data.media object', () => {
    expect(
      service.extractMediaFromWebhook({
        event: 'message',
        data: {
          message_id: 'wamid.HBgMTEST',
          from: '918874369725',
          type: 'document',
          media: {
            id: 'media-456',
            filename: 'munshi-team-template.csv',
            mime_type: 'text/csv',
          },
        },
      }),
    ).toEqual({
      mediaId: 'media-456',
      url: undefined,
      filename: 'munshi-team-template.csv',
      mimeType: 'text/csv',
    });
  });

  it('reads GetOlli document url from data.media', () => {
    expect(
      service.extractMediaFromWebhook({
        event: 'message',
        data: {
          message_id: 'wamid.HBgMTEST',
          from: '918874369725',
          type: 'document',
          media: {
            url: '/uploads/waba-media/1780564424254_munshi-team-template.csv',
            filename: 'munshi-team-template.csv',
          },
        },
      }),
    ).toEqual({
      mediaId: undefined,
      url: '/uploads/waba-media/1780564424254_munshi-team-template.csv',
      filename: 'munshi-team-template.csv',
      mimeType: undefined,
    });
  });

  it('falls back to message_id when media object has no id', () => {
    expect(
      service.extractMediaFromWebhook({
        event: 'message',
        data: {
          message_id: 'wamid.HBgMTEST',
          from: '918874369725',
          type: 'document',
          media: { filename: 'team.csv' },
        },
      }),
    ).toEqual({
      mediaId: 'wamid.HBgMTEST',
      url: undefined,
      filename: 'team.csv',
      mimeType: undefined,
    });
  });
});
