import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export type InboundMediaRef = {
  mediaId?: string;
  url?: string;
  filename?: string;
  mimeType?: string;
};

/** Turn GetOlli relative media paths into absolute download URLs. */
export function resolveOlliMediaUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const mediaBase = process.env.OLLI_MEDIA_BASE_URL?.replace(/\/$/, '');
  if (mediaBase) {
    return trimmed.startsWith('/')
      ? `${mediaBase}${trimmed}`
      : `${mediaBase}/${trimmed}`;
  }

  const olliUrl =
    process.env.OLLI_URL || 'https://api.getolliai.com/api/v1';
  const origin = new URL(olliUrl).origin;

  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }

  return `${olliUrl.replace(/\/$/, '')}/${trimmed}`;
}

@Injectable()
export class OlliMediaService {
  private readonly logger = new Logger(OlliMediaService.name);

  extractMediaFromWebhook(
    body: Record<string, unknown> | null | undefined,
  ): InboundMediaRef | null {
    const data = body?.data as Record<string, unknown> | undefined;
    if (!data) {
      return null;
    }

    const type = String(data.type ?? '').toLowerCase();
    const isFileMessage =
      type === 'document' ||
      type === 'file' ||
      type === 'image' ||
      type === 'audio' ||
      type === 'video';

    if (isFileMessage || data.document || data.file || data.media) {
      for (const candidate of this.mediaCandidates(data)) {
        const ref = this.refFromObject(candidate, data);
        if (ref) {
          return ref;
        }
      }

      if (type === 'document' || type === 'file') {
        return this.refFromMessageId(data);
      }
    }

    if (!isFileMessage) {
      const doc = data.document as Record<string, unknown> | undefined;
      if (doc) {
        return this.refFromObject(doc, data);
      }
    }

    return null;
  }

  private mediaCandidates(data: Record<string, unknown>): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];
    const push = (value: unknown) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        out.push(value as Record<string, unknown>);
      }
    };

    push(data.document);
    push(data.file);

    const rawMedia = data.media;
    if (Array.isArray(rawMedia)) {
      for (const item of rawMedia) {
        push(item);
      }
    } else {
      push(rawMedia);
    }

    return out;
  }

  private refFromMessageId(
    data: Record<string, unknown>,
  ): InboundMediaRef | null {
    const messageId = data.message_id;
    if (typeof messageId !== 'string' || !messageId.trim()) {
      return null;
    }

    const media = data.media;
    const mediaObj =
      media && typeof media === 'object' && !Array.isArray(media)
        ? (media as Record<string, unknown>)
        : undefined;

    return {
      mediaId: messageId.trim(),
      filename:
        typeof data.filename === 'string'
          ? data.filename
          : mediaObj && typeof mediaObj.filename === 'string'
            ? mediaObj.filename
            : mediaObj && typeof mediaObj.file_name === 'string'
              ? mediaObj.file_name
              : mediaObj && typeof mediaObj.name === 'string'
                ? mediaObj.name
                : undefined,
      mimeType:
        typeof data.mime_type === 'string'
          ? data.mime_type
          : typeof data.mimetype === 'string'
            ? data.mimetype
            : mediaObj && typeof mediaObj.mime_type === 'string'
              ? mediaObj.mime_type
              : mediaObj && typeof mediaObj.mimetype === 'string'
                ? mediaObj.mimetype
                : undefined,
    };
  }

  private refFromObject(
    doc: Record<string, unknown>,
    data: Record<string, unknown>,
  ): InboundMediaRef | null {
    const mediaId =
      (doc.id as string) ??
      (doc.media_id as string) ??
      (doc.message_id as string) ??
      (data.media_id as string);
    const url =
      (doc.url as string) ??
      (doc.link as string) ??
      (doc.download_url as string) ??
      (doc.path as string) ??
      (data.url as string);
    const filename =
      (doc.filename as string) ??
      (doc.file_name as string) ??
      (doc.name as string) ??
      (data.filename as string);
    const mimeType =
      (doc.mime_type as string) ??
      (doc.mimetype as string) ??
      (data.mime_type as string);

    if (!mediaId && !url) {
      return null;
    }

    return {
      mediaId: mediaId ? String(mediaId) : undefined,
      url: url ? String(url) : undefined,
      filename: filename ? String(filename) : undefined,
      mimeType: mimeType ? String(mimeType) : undefined,
    };
  }

  async downloadMedia(ref: InboundMediaRef): Promise<Buffer> {
    if (ref.url) {
      try {
        return await this.downloadUrl(ref.url);
      } catch (err) {
        if (ref.mediaId) {
          this.logger.warn(
            `URL download failed (${ref.url}), trying mediaId: ${
              err instanceof Error ? err.message : err
            }`,
          );
          return this.downloadByMediaId(ref.mediaId);
        }
        throw err;
      }
    }
    if (ref.mediaId) {
      return this.downloadByMediaId(ref.mediaId);
    }
    throw new Error('Media reference has no url or id');
  }

  private headers() {
    return {
      'X-API-Key': process.env.OLLI_KEY!,
      'Content-Type': 'application/json',
    };
  }

  private async downloadUrl(url: string): Promise<Buffer> {
    const resolved = resolveOlliMediaUrl(url);
    const res = await axios.get(resolved, {
      responseType: 'arraybuffer',
      headers: this.headers(),
      timeout: 60_000,
      maxContentLength: 10 * 1024 * 1024,
    });
    return Buffer.from(res.data);
  }

  private async downloadByMediaId(mediaId: string): Promise<Buffer> {
    const base = (process.env.OLLI_URL || 'https://api.getolliai.com/api/v1')
      .replace(/\/$/, '');
    const paths = [
      `${base}/external/waba/media/${encodeURIComponent(mediaId)}`,
      `${base}/external/waba/media/${encodeURIComponent(mediaId)}/download`,
      `${base}/media/${encodeURIComponent(mediaId)}`,
    ];

    let lastErr: unknown;
    for (const path of paths) {
      try {
        const meta = await axios.get(path, {
          headers: this.headers(),
          timeout: 30_000,
        });
        const data = meta.data as Record<string, unknown>;
        const nested =
          (data.url as string) ??
          ((data.data as Record<string, unknown> | undefined)?.url as string);
        if (nested) {
          return this.downloadUrl(nested);
        }
        if (meta.data instanceof ArrayBuffer || Buffer.isBuffer(meta.data)) {
          return Buffer.from(meta.data as ArrayBuffer);
        }
      } catch (err) {
        lastErr = err;
        try {
          const bin = await axios.get(path, {
            responseType: 'arraybuffer',
            headers: this.headers(),
            timeout: 60_000,
          });
          return Buffer.from(bin.data);
        } catch (err2) {
          lastErr = err2;
        }
      }
    }

    this.logger.warn(
      `Olli media download failed for ${mediaId}: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
    );
    throw new Error('Could not download file from WhatsApp');
  }
}
