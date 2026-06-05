import {
  buildEmployeeAddButtons,
  buildEmployeeAddMenuOutbound,
} from './team-setup-outbound';
import { WA_INTERACTIVE_ID } from './whatsapp-interactive.constants';

describe('team-setup-outbound', () => {
  it('builds WhatsApp + CSV employee add buttons', () => {
    const buttons = buildEmployeeAddButtons();
    expect(buttons).toHaveLength(2);
    expect(buttons.map((b) => b.id)).toEqual([
      WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
      WA_INTERACTIVE_ID.HOME_BULK_CSV,
    ]);
    for (const b of buttons) {
      expect(b.title.length).toBeLessThanOrEqual(20);
    }
  });

  it('builds interactive_buttons outbound', () => {
    const outbound = buildEmployeeAddMenuOutbound();
    expect(outbound.type).toBe('interactive_buttons');
    if (outbound.type === 'interactive_buttons') {
      expect(outbound.buttons).toHaveLength(2);
    }
  });
});
