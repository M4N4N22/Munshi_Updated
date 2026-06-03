import { resolveTeamSetupActionId } from 'src/core/messaging/whatsapp-interactive.constants';

/** Normalize Olli / WABA webhook payloads into { from, message }. */
export function parseWhatsAppInbound(
  body: Record<string, unknown> | null | undefined,
): { from: string; message: string } | null {
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

  if (data.type === 'text') {
    const text = data.text;
    if (typeof text === 'string' && text.trim()) {
      return { from, message: text.trim() };
    }
    return null;
  }

  if (data.type === 'interactive') {
    // GetOlli: interactive taps use `data.text` = button title (see webhook logs).
    const olliText = data.text;
    if (typeof olliText === 'string' && olliText.trim()) {
      const actionId = resolveTeamSetupActionId(olliText);
      return {
        from,
        message: actionId ?? olliText.trim(),
      };
    }

    const interactive = data.interactive as Record<string, unknown> | undefined;
    if (interactive) {
      const buttonReply = interactive.button_reply as
        | { id?: string }
        | undefined;
      if (buttonReply?.id) {
        return { from, message: String(buttonReply.id).trim() };
      }

      const listReply = interactive.list_reply as { id?: string } | undefined;
      if (listReply?.id) {
        return { from, message: String(listReply.id).trim() };
      }

      if (interactive.type === 'button_reply') {
        const id = interactive.id;
        if (typeof id === 'string' && id.trim()) {
          return { from, message: id.trim() };
        }
      }
    }
  }

  const button = data.button as { payload?: string } | undefined;
  if (button?.payload) {
    return { from, message: String(button.payload).trim() };
  }

  return null;
}
