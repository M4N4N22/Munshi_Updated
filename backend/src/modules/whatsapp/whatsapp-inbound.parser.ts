import { resolveInteractiveActionId } from 'src/core/messaging/whatsapp-interactive.constants';
import type { InboundMediaRef } from 'src/core/messaging/olli-media.service';
import { OlliMediaService } from 'src/core/messaging/olli-media.service';
import {
  buildContactShareNoPhoneMessage,
  parseContactsInbound,
} from './whatsapp-contact.extract';

export type WhatsAppTextInbound = {
  kind: 'text';
  from: string;
  message: string;
};

export type WhatsAppDocumentInbound = {
  kind: 'document';
  from: string;
  media: InboundMediaRef;
};

export type WhatsAppInbound = WhatsAppTextInbound | WhatsAppDocumentInbound;

const mediaExtractor = new OlliMediaService();

/** Normalize Olli / WABA webhook payloads. */
export function parseWhatsAppInbound(
  body: Record<string, unknown> | null | undefined,
): WhatsAppInbound | null {
  const event = body?.event;
  if (event != null && event !== 'message') {
    return null;
  }

  const data = body?.data as Record<string, unknown> | undefined;
  if (!data) {
    return null;
  }

  const from = data.from;
  if (typeof from !== 'string' || !from.trim()) {
    return null;
  }

  const media = mediaExtractor.extractMediaFromWebhook(body);
  if (media) {
    return { kind: 'document', from, media };
  }

  const msgType = String(data.type ?? '').toLowerCase();
  if (msgType === 'contacts' || msgType === 'contact') {
    const parsed = parseContactsInbound(data, body ?? undefined);
    if (parsed.kind === 'phone') {
      return { from, kind: 'text', message: parsed.phone };
    }
    return {
      from,
      kind: 'text',
      message: buildContactShareNoPhoneMessage(parsed.displayName),
    };
  }

  if (data.type === 'text') {
    const text = data.text;
    if (typeof text === 'string' && text.trim()) {
      return { from, kind: 'text', message: text.trim() };
    }
    return null;
  }

  if (data.type === 'interactive') {
    const interactive = data.interactive as Record<string, unknown> | undefined;
    if (interactive) {
      const buttonReply = interactive.button_reply as
        | { id?: string }
        | undefined;
      if (buttonReply?.id) {
        return { from, kind: 'text', message: String(buttonReply.id).trim() };
      }

      const listReply = interactive.list_reply as { id?: string } | undefined;
      if (listReply?.id) {
        return { from, kind: 'text', message: String(listReply.id).trim() };
      }

      if (interactive.type === 'button_reply') {
        const id = interactive.id;
        if (typeof id === 'string' && id.trim()) {
          return { from, kind: 'text', message: id.trim() };
        }
      }
    }

    const olliText = data.text;
    if (typeof olliText === 'string' && olliText.trim()) {
      const actionId = resolveInteractiveActionId(olliText);
      return {
        from,
        kind: 'text',
        message: actionId ?? olliText.trim(),
      };
    }
  }

  const button = data.button as { payload?: string } | undefined;
  if (button?.payload) {
    return { from, kind: 'text', message: String(button.payload).trim() };
  }

  return null;
}
