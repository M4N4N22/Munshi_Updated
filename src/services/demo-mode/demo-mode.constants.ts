/** Certified demo phrases — normalized (lowercase, collapsed whitespace). */
export const DEMO_PHRASE = {
  ATTENDANCE: 'aaj main present hoon',
  TASK_ASSIGN: 'rahul kumar ko store check ka kaam do',
  INVENTORY: 'steel sheets ka stock kitna bacha hai',
  REPORT: 'mujhe aaj ka report dikhao',
  DISCOVERY: 'mera business setup karna hai',
  DOCUMENT_UPLOAD: 'munshi inventory list upload karni hai',
  PR_START: 'purchase request bana do',
  PR_TITLE: 'steel sheets ka order',
  PR_ITEM: 'steel sheets',
  PR_QTY: '25',
  PR_NO: 'no',
  PR_YES: 'yes',
  PR_VENDOR: 'gupta metals',
} as const;

export const DEMO_STEEL_SKU = 'DEMO-STEEL-001';
export const DEMO_STEEL_NAME = 'Steel Sheets';
export const DEMO_VENDOR_NAME = 'Gupta Metals';

export const PROCUREMENT_PHRASES = new Set<string>([
  DEMO_PHRASE.PR_START,
  DEMO_PHRASE.PR_TITLE,
  DEMO_PHRASE.PR_ITEM,
  DEMO_PHRASE.PR_QTY,
  DEMO_PHRASE.PR_NO,
  DEMO_PHRASE.PR_YES,
  DEMO_PHRASE.PR_VENDOR,
]);

export const ALL_DEMO_PHRASES = new Set<string>([
  DEMO_PHRASE.ATTENDANCE,
  DEMO_PHRASE.TASK_ASSIGN,
  DEMO_PHRASE.INVENTORY,
  DEMO_PHRASE.REPORT,
  DEMO_PHRASE.DISCOVERY,
  DEMO_PHRASE.DOCUMENT_UPLOAD,
  ...PROCUREMENT_PHRASES,
]);

export function normalizeDemoPhrase(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;:]+$/g, '');
}

/** Map normalized user text to a certified demo phrase key (exact + safe NL aliases). */
export function resolveDemoPhraseKey(message: string): string | null {
  const norm = normalizeDemoPhrase(message);
  if (ALL_DEMO_PHRASES.has(norm)) {
    return norm;
  }

  // Inventory NL is brittle on WhatsApp (trailing ?, voice-to-text tweaks).
  if (matchesInventoryDemoPhrase(norm)) {
    return DEMO_PHRASE.INVENTORY;
  }

  return null;
}

function matchesInventoryDemoPhrase(norm: string): boolean {
  if (!norm.includes('steel sheets')) {
    return false;
  }
  if (norm.includes('order') || norm.includes('purchase request')) {
    return false;
  }
  return (
    norm.includes('stock') || norm.includes('bacha') || norm.includes('kitna')
  );
}

export function isDemoModeEnabled(): boolean {
  return String(process.env.DEMO_MODE || '').trim().toLowerCase() === 'true';
}
