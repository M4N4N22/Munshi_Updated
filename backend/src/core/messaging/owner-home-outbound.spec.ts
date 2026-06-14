import {
  buildOwnerHomeMainButtons,
  buildOwnerHomeMenuOutbound,
  buildOwnerHomeSecondaryMenuOutbound,
} from './owner-home-outbound';

describe('owner-home-outbound', () => {
  it('builds three main menu buttons within WhatsApp title limit', () => {
    const buttons = buildOwnerHomeMainButtons();
    expect(buttons).toHaveLength(3);
    for (const b of buttons) {
      expect(b.title.length).toBeLessThanOrEqual(20);
    }
  });

  it('builds menu outbound with readiness hint', () => {
    const outbound = buildOwnerHomeMenuOutbound({
      businessName: 'ABC Udyog',
      employeeCount: 2,
      stockItemCount: 0,
      hasEmployees: true,
    });
    expect(outbound.type).toBe('interactive_buttons');
    if (outbound.type === 'interactive_buttons') {
      expect(outbound.body).toContain('2 employee');
      expect(outbound.buttons).toHaveLength(3);
    }
  });

  it('builds secondary menu with help and browse actions', () => {
    const outbound = buildOwnerHomeSecondaryMenuOutbound();
    expect(outbound.type).toBe('interactive_buttons');
    if (outbound.type === 'interactive_buttons') {
      expect(outbound.buttons).toHaveLength(3);
      expect(outbound.buttons.map((b) => b.id)).toEqual([
        'home_show_help',
        'home_stock_status',
        'home_show_team',
      ]);
    }
  });
});
