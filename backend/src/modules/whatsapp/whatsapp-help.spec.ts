import { USER_ROLE } from 'src/services/users/users.constants';
import { COMMANDS } from './whatsapp.constants';
import { buildHelpMessages, formatCommandHints } from './whatsapp-help';
import { COMMAND_HINTS } from './whatsapp.constants';

describe('whatsapp-help', () => {
  describe('formatCommandHints', () => {
    it('lists commands and omits /help', () => {
      const text = formatCommandHints(COMMAND_HINTS);
      expect(text).toContain(`*${COMMANDS.PRESENT}*`);
      expect(text).not.toContain(COMMANDS.HELP);
    });
  });

  describe('buildHelpMessages', () => {
    it('returns one message for workers with daily commands only', () => {
      const messages = buildHelpMessages('Ramesh', USER_ROLE.WORKER);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('Rozmarra');
      expect(messages[0]).toContain(COMMANDS.PRESENT);
      expect(messages[0]).not.toContain(COMMANDS.INVENTORY_STATUS);
    });

    it('returns two messages for owners with inventory section', () => {
      const messages = buildHelpMessages('Priya', USER_ROLE.OWNER);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('Rozmarra');
      expect(messages[0]).toContain(COMMANDS.ASSIGN);
      expect(messages[1]).toContain('Maal aur kharidi');
      expect(messages[1]).toContain(COMMANDS.INVENTORY_IMPORT_CSV);
      expect(messages[1]).toContain(COMMANDS.PURCHASE_REQUEST_CREATE);
    });

    it('returns two messages for managers', () => {
      const messages = buildHelpMessages('Anil', USER_ROLE.MANAGER);
      expect(messages).toHaveLength(2);
      expect(messages[1]).toContain(COMMANDS.ONBOARD_WORKER);
    });
  });
});
