/** Shared WhatsApp message layout — consistent dividers and tone. */
export const WA_DIVIDER = '━━━━━━━━━━━━━━━';
export const WA_DIVIDER_WIDE = '━━━━━━━━━━━━━━━━';

export function waSection(title: string, body: string, footer?: string): string {
  let msg = `${WA_DIVIDER}\n*${title}*\n${WA_DIVIDER}\n\n${body.trim()}`;
  if (footer) {
    msg += `\n\n${WA_DIVIDER}\n${footer.trim()}`;
  }
  return msg;
}

export function waHelpText(userName: string): string {
  return (
    `👋 Hello *${userName || 'there'}*,\n\n` +
    `Welcome to *Munshi* — attendance, kaam aur issues WhatsApp se.\n\n` +
    `${WA_DIVIDER}\n` +
    `*Attendance*\n` +
    `• "present"\n` +
    `• "absent"\n\n` +
    `*Tasks*\n` +
    `• "show my tasks"\n` +
    `• "complete task 4"\n` +
    `• "@anand finish machine repair"\n` +
    `• "@3 finish machine repair"\n` +
    `• "@all clean warehouse today"\n` +
    `• "update task 3 work completed"\n\n` +
    `*Managers* (after an owner assigns you a task)\n` +
    `• "I will do task 12" — you handle it\n` +
    `• "@anil will do task 12" — delegate to a worker\n` +
    `• "/mgrtransfer 12 sales" — wrong department, send elsewhere\n` +
    `• "/mgrreject 12 not our scope" — reject with reason (owner notified)\n` +
    `• Managers can also mark any task in their department done\n\n` +
    `*Issues*\n` +
    `• "machine not working"\n` +
    `• "show active issues"\n` +
    `• "resolve issue 5"\n\n` +
    `*Team*\n` +
    `• "show team"\n` +
    `• "who is absent today"\n\n` +
    `${WA_DIVIDER}\n` +
    `*Owners:* assign to a department with natural language (e.g. assign to sales: today's figures). You can also use @name, @id, or @phone.\n\n` +
    `💡 Examples:\n` +
    `• @anand aaj khana bna lena\n` +
    `• @3 aaj khana bna lena`
  );
}

export function waErrorInvalidFormat(
  command: string,
  usage: string,
  example: string,
): string {
  return waSection(
    'Invalid format',
    `*Command:* ${command}\n\n*Usage:*\n${usage}\n\n*Example:*\n${example}`,
    '💡 Send /help for more examples.',
  );
}

export function waErrorTaskIdRequired(examples: string[]): string {
  const examplesBlock = examples.map((e) => `• ${e}`).join('\n');
  return waSection(
    'Task number required',
    `Please include the task number in your message.\n\n*Examples:*\n${examplesBlock}`,
  );
}

export function waErrorWorkerRequired(taskId: number): string {
  return waSection(
    'Assignee required',
    `Please specify who should do task #${taskId} using @name, @id, or @phone.\n\n*Examples:*\n` +
      `• "@anil will do task ${taskId}"\n` +
      `• "Assign task ${taskId} to @4"`,
  );
}

export function waErrorDescriptionRequired(): string {
  return waSection(
    'Description required',
    'Please include what needs to be done in your message.',
  );
}

export function waErrorOwnersOnlyDepartment(): string {
  return waSection(
    'Department assignment',
    'Only factory *owners* can assign work to a department.\n\nManagers and workers should use *@name*, *@id*, or *@phone* for direct assignment.',
  );
}

export function waErrorMissingDepartSlug(): string {
  return waSection(
    'Department not specified',
    'We could not identify which department to assign to.\n\nPlease try again with a clear department name, or contact your administrator.',
  );
}

export function waErrorDepartmentNotFound(slug: string): string {
  return waSection(
    'Department not found',
    `No department matches *${slug}* in your factory.\n\nPlease check the name and try again, or ask your administrator to add the department.`,
  );
}

export function waTaskAssigned(description: string, detail: string): string {
  return waSection(
    'Task assigned',
    `*Task:* ${description}\n\n${detail}`,
  );
}

export function waTaskCompleted(taskId: number, detail: string): string {
  return waSection('Task completed', `*Task #${taskId}*\n\n${detail}`);
}

export function waTaskUpdated(taskId: number, update: string, detail: string): string {
  return waSection(
    'Task updated',
    `*Task #${taskId}*\n*Update:* ${update}\n\n${detail}`,
  );
}

export function waIssueReported(message: string): string {
  return waSection(
    'Issue reported',
    `Your report has been recorded.\n\n*Details:*\n${message}\n\nThe management team has been notified.`,
  );
}

export function waIssueResolved(issueId: number, detail: string): string {
  return waSection('Issue resolved', `*Issue #${issueId}*\n\n${detail}`);
}

export function waIssuesEmpty(): string {
  return waSection(
    'Active issues',
    'No open issues at the moment.\n\nEverything is running smoothly.',
  );
}

export function waTasksEmpty(): string {
  return waSection(
    'Tasks',
    'You have no pending tasks.\n\nYou are all caught up.',
  );
}

export function waTeamEmpty(): string {
  return waSection(
    'Team',
    'Abhi koi employee juda nahi hai.\n\n*hello* ya *Home par jayein* — phir *Employee jodiyein* → WhatsApp ya CSV se log jodiyein.\n\n_Website dashboard jald aa raha hai._',
  );
}

export function waDepartmentAssignSent(
  description: string,
  dept: { name: string; slug: string },
): string {
  return waSection(
    'Sent to department',
    `*Task:* ${description}\n` +
      `*Department:* ${dept.name} (\`${dept.slug}\`)\n\n` +
      `The department manager has been notified. They will accept the task or assign it to a team member.`,
  );
}

export function waUnknownCommand(): string {
  return waSection(
    'Samajh nahi aaya',
    'Ye message clear nahi hai.\n\nNeeche *Home par jayein* button dabayein, ya seedha kaam / attendance likhein.',
  );
}
