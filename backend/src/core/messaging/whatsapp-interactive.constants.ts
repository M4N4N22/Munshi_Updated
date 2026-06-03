/** Stable WhatsApp interactive reply button IDs (also used as inbound message text). */
export const WA_INTERACTIVE_ID = {
  TEAM_GOOGLE_FORM: 'team_google_form',
  TEAM_DASHBOARD: 'team_dashboard',
  TEAM_ONBOARD_WA: 'team_onboard_wa',
} as const;

export type WaInteractiveId =
  (typeof WA_INTERACTIVE_ID)[keyof typeof WA_INTERACTIVE_ID];

const TEAM_SETUP_IDS = new Set<string>(Object.values(WA_INTERACTIVE_ID));

/** Button labels shown in WhatsApp (Olli echoes these in `data.text` on tap). */
export const WA_TEAM_SETUP_BUTTON_TITLES = {
  [WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM]: 'Google Form se add',
  [WA_INTERACTIVE_ID.TEAM_DASHBOARD]: 'Dashboard par add',
  [WA_INTERACTIVE_ID.TEAM_ONBOARD_WA]: 'WhatsApp par add',
} as const;

const TITLE_TO_ACTION_ID = new Map<string, WaInteractiveId>(
  Object.entries(WA_TEAM_SETUP_BUTTON_TITLES).map(([id, title]) => [
    title.toLowerCase(),
    id as WaInteractiveId,
  ]),
);

/**
 * Resolve Olli/Meta button tap to a stable action id.
 * Olli webhook: `{ type: 'interactive', text: '<button title>' }` (no button_reply.id).
 */
export function resolveTeamSetupActionId(message: string): WaInteractiveId | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }
  if (TEAM_SETUP_IDS.has(trimmed)) {
    return trimmed as WaInteractiveId;
  }

  const lower = trimmed.toLowerCase();
  const exact = TITLE_TO_ACTION_ID.get(lower);
  if (exact) {
    return exact;
  }

  for (const [title, id] of TITLE_TO_ACTION_ID.entries()) {
    if (lower === title || lower.endsWith(title)) {
      return id;
    }
  }

  return null;
}

export function isTeamSetupInteractiveId(message: string): boolean {
  return resolveTeamSetupActionId(message) != null;
}
