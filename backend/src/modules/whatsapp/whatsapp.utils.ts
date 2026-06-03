export function formatCommandHints(commands: any[]) {
    return commands
      .map((c) => `${c.command} - ${c.hint}`)
      .join('\n');
  }