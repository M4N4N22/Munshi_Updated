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

function normalizeGreetingInput(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[!.,?…🙏]+$/g, '')
    .trim();
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

  if (GREETING_EXACT.has(lower)) {
    return true;
  }

  if (GREETING_START_RE.test(lower)) {
    return true;
  }

  return false;
}

/** START, menu, home button label, or natural greetings → show owner home. */
export function isChatHomeTrigger(message: string): boolean {
  return isOwnerHomeTrigger(message) || isGreetingMessage(message);
}
