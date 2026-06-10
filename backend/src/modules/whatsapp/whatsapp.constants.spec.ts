import {
  COMMANDS,
  isHelpPhrase,
  isHelpRequest,
  parseDirectSlashCommand,
} from './whatsapp.constants';

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

describe('isHelpPhrase', () => {
  it('matches plain help and madad phrases', () => {
    expect(isHelpPhrase('help')).toBe(true);
    expect(isHelpPhrase('HELP')).toBe(true);
    expect(isHelpPhrase('madad')).toBe(true);
    expect(isHelpPhrase('help chahiye')).toBe(true);
    expect(isHelpPhrase('commands dikhao')).toBe(true);
    expect(isHelpPhrase('hello')).toBe(false);
  });
});

describe('isHelpRequest', () => {
  it('matches slash and plain help', () => {
    expect(isHelpRequest('/help')).toBe(true);
    expect(isHelpRequest('help')).toBe(true);
    expect(isHelpRequest('madad chahiye')).toBe(true);
    expect(isHelpRequest('/tasks')).toBe(false);
  });
});
