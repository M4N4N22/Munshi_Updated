import { USER_ROLE } from 'src/services/users/users.constants';
import { buildHelpMessages } from './whatsapp-help';

describe('whatsapp-help', () => {
  describe('buildHelpMessages', () => {
    it('returns one chat-first message for workers without slash catalog', () => {
      const messages = buildHelpMessages('Ramesh', USER_ROLE.WORKER);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('present');
      expect(messages[0]).toContain('show my tasks');
      expect(messages[0]).not.toContain('/assign');
      expect(messages[0]).not.toContain('ML returns');
    });

    it('returns two user-facing messages for owners', () => {
      const messages = buildHelpMessages('Priya', USER_ROLE.OWNER);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('hello');
      expect(messages[0]).toContain('@ram aaj store saaf karega');
      expect(messages[0]).not.toContain('/depart_assign');
      expect(messages[1]).toContain('Maal aur kharidi');
      expect(messages[1]).toContain('ink kitna hai');
      expect(messages[1]).toContain('Employee jodiyein');
    });

    it('returns two messages for managers with manager section', () => {
      const messages = buildHelpMessages('Anil', USER_ROLE.MANAGER);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('I will do task 12');
      expect(messages[1]).toContain('cancel');
    });
  });
});
