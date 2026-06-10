import { USER_ROLE } from 'src/services/users/users.constants';
import { COMMAND_HINTS, COMMANDS } from './whatsapp.constants';
import { WA_DIVIDER } from './whatsapp.templates';

type CommandHint = (typeof COMMAND_HINTS)[number];

/** All workers can use these. */
export const WORKER_HELP_COMMANDS = new Set<string>([
  COMMANDS.PRESENT,
  COMMANDS.ABSENT,
  COMMANDS.TASKS,
  COMMANDS.COMPLETE,
  COMMANDS.CANCEL,
  COMMANDS.ISSUE,
  COMMANDS.ISSUES,
  COMMANDS.RESOLVE,
  COMMANDS.MEMEBERS,
]);

/** Owners / managers — tasks, team, reports (message 1). */
export const MANAGER_DAILY_EXTRA_COMMANDS = new Set<string>([
  COMMANDS.ASSIGN,
  COMMANDS.ASSIGN_DELIVERY,
  COMMANDS.DEPART_ASSIGN,
  COMMANDS.MGR_SELF,
  COMMANDS.MGR_ASSIGN,
  COMMANDS.MGR_TRANSFER,
  COMMANDS.MGR_REJECT,
  COMMANDS.UPDATE,
  COMMANDS.REPORT,
]);

/** Owners / managers — inventory & procurement (message 2). */
export const INVENTORY_PROCUREMENT_COMMANDS = new Set<string>([
  COMMANDS.INVENTORY_STATUS,
  COMMANDS.INVENTORY_CREATE,
  COMMANDS.INVENTORY_IMPORT_CSV,
  COMMANDS.PURCHASE_REQUEST_CREATE,
  COMMANDS.ONBOARD_VENDOR,
  COMMANDS.ONBOARD_WORKER,
]);

export function formatCommandHints(hints: readonly CommandHint[]): string {
  return hints
    .filter((h) => h.command !== COMMANDS.HELP)
    .map((h) => `• *${h.command}* — ${h.hint}`)
    .join('\n');
}

function hintsForCommands(allowed: Set<string>): CommandHint[] {
  return COMMAND_HINTS.filter((h) => allowed.has(h.command));
}

function buildHelpSection(title: string, hints: CommandHint[]): string {
  if (hints.length === 0) {
    return '';
  }
  return `${WA_DIVIDER}\n*${title}*\n${formatCommandHints(hints)}`;
}

function isManagerOrOwner(role: string | undefined): boolean {
  const r = (role || '').toUpperCase();
  return r === USER_ROLE.OWNER || r === USER_ROLE.MANAGER;
}

const HELP_FOOTER =
  'Home menu ke liye *hello*, *namaste*, ya *Home par jayein* likhein.\n' +
  'Dobara commands: */help* ya *help*.';

/** One message for workers; two for owners/managers (daily + inventory). */
export function buildHelpMessages(
  userName: string,
  role: string | undefined,
): string[] {
  const name = userName?.trim() || 'there';
  const intro =
    `👋 Namaste *${name}*,\n\n` +
    `*Munshi* — neeche registered commands (slash ya natural language).`;

  if (!isManagerOrOwner(role)) {
    const body = buildHelpSection(
      'Rozmarra — attendance, kaam, issues',
      hintsForCommands(WORKER_HELP_COMMANDS),
    );
    return [`${intro}\n\n${body}\n\n${WA_DIVIDER}\n${HELP_FOOTER}`];
  }

  const dailyAllowed = new Set([
    ...WORKER_HELP_COMMANDS,
    ...MANAGER_DAILY_EXTRA_COMMANDS,
  ]);

  const message1 = `${intro}\n\n${buildHelpSection(
    'Rozmarra — attendance, tasks, team',
    hintsForCommands(dailyAllowed),
  )}`;

  const message2 = `${buildHelpSection(
    'Maal aur kharidi — inventory & procurement',
    hintsForCommands(INVENTORY_PROCUREMENT_COMMANDS),
  )}\n\n${WA_DIVIDER}\n${HELP_FOOTER}`;

  return [message1, message2];
}
