/** Extract a stable provider message id for inbound webhook deduplication. */
export function extractWebhookDedupeKey(
  body: Record<string, unknown> | null | undefined,
): string | null {
  const data = body?.data as Record<string, unknown> | undefined;
  if (!data) {
    return null;
  }

  const topLevel =
    data.message_id ?? data.messageId ?? data.id ?? body?.message_id;
  if (typeof topLevel === 'string' && topLevel.trim()) {
    return topLevel.trim();
  }

  for (const nested of nestedMediaObjects(data)) {
    const id =
      nested.id ?? nested.media_id ?? nested.message_id ?? nested.messageId;
    if (typeof id === 'string' && id.trim()) {
      return id.trim();
    }
  }

  return null;
}

function nestedMediaObjects(
  data: Record<string, unknown>,
): Record<string, unknown>[] {
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
