export const COMMANDS = {
  PRESENT: '/present',
  ABSENT: '/absent',
  TASKS: '/tasks',
  COMPLETE: '/complete',
  ASSIGN: '/assign',
  DEPART_ASSIGN: '/depart_assign',
  MGR_SELF: '/mgrself',
  MGR_ASSIGN: '/mgrassign',
  MGR_TRANSFER: '/mgrtransfer',
  MGR_REJECT: '/mgrreject',
  UPDATE: '/update',
  ISSUE: '/issue',
  ISSUES: '/issues',
  RESOLVE: '/resolve',
  MEMEBERS: '/members',
  HELP: '/help',
  REPORT: '/report',
  ONBOARD_VENDOR: '/onboard_vendor',
};

export const COMMAND_HINTS = [
  { command: COMMANDS.PRESENT, hint: 'Mark attendance as present' },
  { command: COMMANDS.ABSENT, hint: 'Mark attendance as absent' },
  { command: COMMANDS.TASKS, hint: 'View your tasks' },
  { command: COMMANDS.COMPLETE, hint: '/complete [taskId]' },
  {
    command: COMMANDS.ASSIGN,
    hint: '/assign @<name|id|phone> or @all [task]',
  },
  {
    command: COMMANDS.DEPART_ASSIGN,
    hint: 'NL to dept — ML returns /depart_assign + depart_slug (e.g. it)',
  },
  {
    command: COMMANDS.MGR_SELF,
    hint: 'NL: "I will do task 12" — manager accepts owner task',
  },
  {
    command: COMMANDS.MGR_ASSIGN,
    hint: 'NL: "@anil will do task 12" — manager delegates to worker',
  },
  {
    command: COMMANDS.MGR_TRANSFER,
    hint: '/mgrtransfer [taskId] [dept_slug] — send to another department',
  },
  {
    command: COMMANDS.MGR_REJECT,
    hint: '/mgrreject [taskId] [reason] — reject misrouted task (owner notified)',
  },
  { command: COMMANDS.UPDATE, hint: '/update [taskId] [message]' },
  { command: COMMANDS.ISSUE, hint: '/issue [message]' },
  { command: COMMANDS.ISSUES, hint: 'View active issues' },
  { command: COMMANDS.RESOLVE, hint: '/resolve [issueId]' },
  { command: COMMANDS.MEMEBERS, hint: 'View active members' },
  { command: COMMANDS.HELP, hint: 'View command hints' },
  { command: COMMANDS.REPORT, hint: '/report [date]' },
  {
    command: COMMANDS.ONBOARD_VENDOR,
    hint: 'Start vendor onboarding workflow (managers/owners)',
  },
];
