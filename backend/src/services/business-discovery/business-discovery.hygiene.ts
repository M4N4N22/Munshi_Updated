/**
 * Discovery data hygiene — operational WhatsApp commands must not pollute onboarding buckets.
 */

const OPERATIONAL_PATTERNS: RegExp[] = [
  /^\/\w+/i,
  /\b(inventory|stock|invntry)\s+(status|batao|dikhao|check|dekho)/i,
  /\b(purchase\s+request|procurement|PR\s+banao|order\s+create)/i,
  /\b(task\s+\d+|kaam\s+do|assign|transfer|mgrassign|mgrtransfer|mgrreject|mgrself)/i,
  /\b(issues?|resolve|problem\s+fixed|issue\s+close)/i,
  /\b(present|absent|attendance|chutti|leave)\b/i,
  /\b(report|summary)\s+(dikhao|batao|chahiye|generate)/i,
  /\b(vendor\s+add|worker\s+add|onboard|SKU\s+register)/i,
  /\b(help|madad|commands?\s+dikhao)/i,
  /\b(team\s+members?|members?\s+dikhao|employee\s+list)/i,
  /\bmera\s+(kaam|task)/i,
  /\bprogress\s+update/i,
  /\btask\s+complete/i,
];

/** Values that are clearly operational phrases, not onboarding answers. */
export function isOperationalCommand(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return OPERATIONAL_PATTERNS.some((re) => re.test(trimmed));
}

/** Strip polluted bucket_data entries (operational phrases stored as field values). */
export function sanitizeBucketData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith('__source') || key.endsWith('_document_boost')) {
      clean[key] = value;
      continue;
    }
    if (typeof value === 'string' && isOperationalCommand(value)) {
      continue;
    }
    if (value === true || value === 'done') {
      clean[key] = value;
      continue;
    }
    if (typeof value === 'string' && value.length > 0) {
      clean[key] = value;
    } else if (typeof value !== 'string') {
      clean[key] = value;
    }
  }
  return clean;
}
