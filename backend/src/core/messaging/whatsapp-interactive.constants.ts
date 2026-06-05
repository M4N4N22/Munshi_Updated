/** Stable WhatsApp interactive reply button IDs (also used as inbound message text). */
export const WA_INTERACTIVE_ID = {
  TEAM_GOOGLE_FORM: 'team_google_form',
  TEAM_DASHBOARD: 'team_dashboard',
  TEAM_ONBOARD_WA: 'team_onboard_wa',
  HOME_BULK_CSV: 'home_bulk_csv',
  HOME_ADD_EMPLOYEE: 'home_add_employee',
  HOME_ADD_STOCK: 'home_add_stock',
  HOME_ASSIGN_TASK: 'home_assign_task',
  HOME_GO_HOME: 'home_go_home',
} as const;

export type WaInteractiveId =
  (typeof WA_INTERACTIVE_ID)[keyof typeof WA_INTERACTIVE_ID];

const ALL_INTERACTIVE_IDS = new Set<string>(Object.values(WA_INTERACTIVE_ID));

/** Button labels shown in WhatsApp (Olli echoes these in `data.text` on tap). */
export const WA_TEAM_SETUP_BUTTON_TITLES = {
  [WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM]: 'Google Form se add',
  [WA_INTERACTIVE_ID.TEAM_DASHBOARD]: 'Dashboard par add',
  [WA_INTERACTIVE_ID.TEAM_ONBOARD_WA]: 'WhatsApp par add',
  [WA_INTERACTIVE_ID.HOME_BULK_CSV]: 'CSV se bulk add',
} as const;

export const WA_OWNER_HOME_BUTTON_TITLES = {
  [WA_INTERACTIVE_ID.HOME_ADD_EMPLOYEE]: 'Employee jodiyein',
  [WA_INTERACTIVE_ID.HOME_ADD_STOCK]: 'Maal / stock jodein',
  [WA_INTERACTIVE_ID.HOME_ASSIGN_TASK]: 'Kaam assign karein',
  [WA_INTERACTIVE_ID.HOME_GO_HOME]: 'Home par jayein',
} as const;

const TITLE_TO_ACTION_ID = new Map<string, WaInteractiveId>(
  [
    ...Object.entries(WA_TEAM_SETUP_BUTTON_TITLES),
    ...Object.entries(WA_OWNER_HOME_BUTTON_TITLES),
  ].map(([id, title]) => [title.toLowerCase(), id as WaInteractiveId] as const),
);

const OWNER_HOME_TRIGGERS = new Set(
  [
    'start',
    '/menu',
    'menu',
    'menyu',
    'मेन्यू',
    'main menu',
    'home',
    'home par jayein',
    'namaste',
    'namaste ji',
    'नमस्ते',
  ].map((s) => s.toLowerCase()),
);

/**
 * Resolve Olli/Meta button tap to a stable action id.
 * Olli webhook: `{ type: 'interactive', text: '<button title>' }` (no button_reply.id).
 */
export function resolveInteractiveActionId(
  message: string,
): WaInteractiveId | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }
  if (ALL_INTERACTIVE_IDS.has(trimmed)) {
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

/** @deprecated Use resolveInteractiveActionId */
export function resolveTeamSetupActionId(message: string): WaInteractiveId | null {
  const id = resolveInteractiveActionId(message);
  if (!id) {
    return null;
  }
  if (
    id === WA_INTERACTIVE_ID.HOME_ADD_EMPLOYEE ||
    id === WA_INTERACTIVE_ID.HOME_ADD_STOCK ||
    id === WA_INTERACTIVE_ID.HOME_ASSIGN_TASK ||
    id === WA_INTERACTIVE_ID.HOME_GO_HOME ||
    id === WA_INTERACTIVE_ID.HOME_BULK_CSV
  ) {
    return null;
  }
  return id;
}

export function isTeamSetupInteractiveId(message: string): boolean {
  return resolveTeamSetupActionId(message) != null;
}

export function isOwnerHomeInteractiveId(message: string): boolean {
  const id = resolveInteractiveActionId(message);
  return (
    id === WA_INTERACTIVE_ID.HOME_ADD_EMPLOYEE ||
    id === WA_INTERACTIVE_ID.HOME_ADD_STOCK ||
    id === WA_INTERACTIVE_ID.HOME_ASSIGN_TASK ||
    id === WA_INTERACTIVE_ID.HOME_GO_HOME ||
    id === WA_INTERACTIVE_ID.HOME_BULK_CSV
  );
}

export function isOwnerHomeTrigger(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  return OWNER_HOME_TRIGGERS.has(trimmed.toLowerCase());
}
