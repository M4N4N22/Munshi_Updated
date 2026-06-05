import {
  buildOwnerHomeMainButtons,
  buildOwnerHomeMenuOutbound,
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
});
