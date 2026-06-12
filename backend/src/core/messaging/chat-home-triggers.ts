import { isOwnerHomeTrigger } from './whatsapp-interactive.constants';

/** Short exact phrases → open owner home (chat-first, not slash commands). */
const GREETING_EXACT = new Set(
  [
    'hi',
    'hii',
    'hey',
    'hello',
    'helo',
    'hlo',
    'hlw',
    'hy',
    'hai',
    'hii ji',
    'hi ji',
    'hey ji',
    'hello ji',
    'namaste',
    'namaste ji',
    'namastey',
    'namasty',
    'namasye',
    'namskar',
    'namaskar',
    'namste',
    'नमस्ते',
    'नमस्कार',
    'pranam',
    'ram ram',
    'radhe radhe',
    'jai shree ram',
    'good morning',
    'good afternoon',
    'good evening',
    'good night',
    'morning',
    'evening',
    'gm',
    'gn',
    'sup',
    'yo',
    'kaise ho',
    'kya haal',
    'kya hal',
    'munshi',
    'munshi ji',
    'start munshi',
  ].map((s) => s.toLowerCase()),
);

const GREETING_START_RE =
  /^(hi+|hey+|hello+|namast[eey]?|namasye|namskar|namaskar|नमस्ते|नमस्कार|good\s+(morning|afternoon|evening|night)|ram\s+ram)\b/i;

/** Verbs, entities, and quantities that indicate a work instruction — not a hello. */
const WORK_INSTRUCTION_RE =
  /(@\w+|\b(ko|karo|karega|karein|karwa|karwado|karna|karni|assign|deliver|order|stock|maal|inventory|task|kaam|website|warehouse|banegi|banani|banega|jodiyein|jodein|import|csv|purchase|vendor|bhejo|bolo|bolna|present|absent|attend|attendance|karwa\s*do|kar\s*do)\b|\d+\s*(kg|kgs|ltr|litre|liter|piece|pcs|unit)s?\b)/i;

function normalizeGreetingInput(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[!.,?…🙏]+$/g, '')
    .trim();
}

function looksLikeWorkInstruction(normalized: string): boolean {
  if (WORK_INSTRUCTION_RE.test(normalized)) {
    return true;
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length > 5;
}

/**
 * True when the user is saying hello / starting a conversation (not giving a work instruction).
 */
export function isGreetingMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }

  const lower = normalizeGreetingInput(trimmed);

  if (lower.length > 80) {
    return false;
  }

  if (looksLikeWorkInstruction(lower)) {
    return false;
  }

  if (GREETING_EXACT.has(lower)) {
    return true;
  }

  if (GREETING_START_RE.test(lower)) {
    const withoutGreeting = lower
      .replace(GREETING_START_RE, '')
      .trim()
      .replace(/^(ji|🙏)+\s*/i, '')
      .trim();
    if (!withoutGreeting) {
      return true;
    }
    // "namaste rajesh" / "good morning ji" — still a hello, not a task.
    const tailWords = withoutGreeting.split(/\s+/).filter(Boolean);
    if (tailWords.length <= 2 && !WORK_INSTRUCTION_RE.test(withoutGreeting)) {
      return true;
    }
    return false;
  }

  return false;
}

/** START, menu, home button label, or natural greetings → show owner home. */
export function isChatHomeTrigger(message: string): boolean {
  return isOwnerHomeTrigger(message) || isGreetingMessage(message);
}
