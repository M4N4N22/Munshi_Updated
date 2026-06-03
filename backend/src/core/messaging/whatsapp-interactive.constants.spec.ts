import {
  resolveTeamSetupActionId,
  WA_INTERACTIVE_ID,
} from './whatsapp-interactive.constants';

describe('resolveTeamSetupActionId', () => {
  it('resolves stable ids', () => {
    expect(resolveTeamSetupActionId('team_google_form')).toBe(
      WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM,
    );
  });

  it('resolves Olli button titles', () => {
    expect(resolveTeamSetupActionId('Dashboard par add')).toBe(
      WA_INTERACTIVE_ID.TEAM_DASHBOARD,
    );
  });

  it('resolves title suffix on long pasted text', () => {
    const long =
      'Team required\n...\naaj website banegi\nGoogle Form se add';
    expect(resolveTeamSetupActionId(long)).toBe(
      WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM,
    );
  });
});
