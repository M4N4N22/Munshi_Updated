import {
  buildEmptyTeamSetupButtons,
  buildEmptyTeamSetupOutbound,
} from './team-setup-outbound';
import { WA_INTERACTIVE_ID } from './whatsapp-interactive.constants';

describe('team-setup-outbound', () => {
  it('builds three team setup reply buttons', () => {
    const buttons = buildEmptyTeamSetupButtons();
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.id)).toEqual([
      WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM,
      WA_INTERACTIVE_ID.TEAM_DASHBOARD,
      WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
    ]);
    for (const b of buttons) {
      expect(b.title.length).toBeLessThanOrEqual(20);
    }
  });

  it('builds interactive_buttons outbound', () => {
    const outbound = buildEmptyTeamSetupOutbound('Team required');
    expect(outbound.type).toBe('interactive_buttons');
    if (outbound.type === 'interactive_buttons') {
      expect(outbound.body).toBe('Team required');
      expect(outbound.buttons).toHaveLength(3);
    }
  });
});
