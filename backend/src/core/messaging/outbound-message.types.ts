export type WaReplyButton = {
  id: string;
  title: string;
};

export type WaOutboundMessage =
  | { type: 'text'; body: string }
  | {
      type: 'interactive_buttons';
      body: string;
      buttons: WaReplyButton[];
    }
  | {
      type: 'interactive_cta_url';
      body: string;
      displayText: string;
      url: string;
    };

export function textOutbound(body: string): WaOutboundMessage {
  return { type: 'text', body };
}

export function normalizeOutbound(
  result: string | WaOutboundMessage | null | undefined,
): WaOutboundMessage {
  if (result == null) {
    return textOutbound('');
  }
  if (typeof result === 'string') {
    return textOutbound(result);
  }
  return result;
}
