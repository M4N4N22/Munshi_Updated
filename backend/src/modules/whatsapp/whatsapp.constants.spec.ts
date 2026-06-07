import { COMMANDS, parseDirectSlashCommand } from './whatsapp.constants';

describe('parseDirectSlashCommand', () => {
  it('recognizes registered slash commands', () => {
    expect(parseDirectSlashCommand('/help')).toBe(COMMANDS.HELP);
    expect(parseDirectSlashCommand('/members')).toBe(COMMANDS.MEMEBERS);
    expect(parseDirectSlashCommand('/tasks')).toBe(COMMANDS.TASKS);
  });

  it('ignores unknown slash prefixes', () => {
    expect(parseDirectSlashCommand('/unknown_cmd')).toBeNull();
    expect(parseDirectSlashCommand('help')).toBeNull();
  });

  it('parses command with trailing arguments', () => {
    expect(parseDirectSlashCommand('/complete 42')).toBe(COMMANDS.COMPLETE);
  });
});
