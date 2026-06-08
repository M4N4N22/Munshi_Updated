import {
  isLowStockPurchaseCtaTitle,
  isOwnerHomeTrigger,
  isPurchaseRequestWorkflowCommand,
  resolveInteractiveActionId,
  WA_INTERACTIVE_ID,
} from './whatsapp-interactive.constants';
import { WA_LOW_STOCK_PURCHASE_BUTTON_TITLE } from './inventory-low-stock-outbound';
import { isChatHomeTrigger } from './chat-home-triggers';

describe('resolveInteractiveActionId', () => {
  it('resolves team setup ids', () => {
    expect(resolveInteractiveActionId('team_google_form')).toBe(
      WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM,
    );
  });

  it('resolves Olli button titles for team', () => {
    expect(resolveInteractiveActionId('WhatsApp par add')).toBe(
      WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
    );
  });

  it('resolves owner home menu buttons', () => {
    expect(resolveInteractiveActionId('Employee jodiyein')).toBe(
      WA_INTERACTIVE_ID.HOME_ADD_EMPLOYEE,
    );
    expect(resolveInteractiveActionId('Kaam assign karein')).toBe(
      WA_INTERACTIVE_ID.HOME_ASSIGN_TASK,
    );
    expect(resolveInteractiveActionId('Home par jayein')).toBe(
      WA_INTERACTIVE_ID.HOME_GO_HOME,
    );
  });

  it('resolves title suffix on long pasted text', () => {
    const long =
      'Team required\n...\naaj website banegi\nGoogle Form se add';
    expect(resolveInteractiveActionId(long)).toBe(
      WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM,
    );
  });
});

describe('isOwnerHomeTrigger', () => {
  it('matches START and menu', () => {
    expect(isOwnerHomeTrigger('START')).toBe(true);
    expect(isOwnerHomeTrigger('start')).toBe(true);
    expect(isOwnerHomeTrigger('menu')).toBe(true);
    expect(isOwnerHomeTrigger('/menu')).toBe(true);
  });

  it('does not match random chat', () => {
    expect(isOwnerHomeTrigger('present')).toBe(false);
  });
});

describe('isLowStockPurchaseCtaTitle', () => {
  it('matches low-stock CTA titles', () => {
    expect(isLowStockPurchaseCtaTitle(WA_LOW_STOCK_PURCHASE_BUTTON_TITLE)).toBe(
      true,
    );
    expect(isLowStockPurchaseCtaTitle('Create Order')).toBe(true);
    expect(isLowStockPurchaseCtaTitle('purchase')).toBe(true);
    expect(isLowStockPurchaseCtaTitle('hello')).toBe(false);
  });
});

describe('isPurchaseRequestWorkflowCommand', () => {
  it('matches purchase request slash commands', () => {
    expect(isPurchaseRequestWorkflowCommand('/purchase_request_create')).toBe(
      true,
    );
    expect(
      isPurchaseRequestWorkflowCommand('/purchase_request_create?itemId=42'),
    ).toBe(true);
    expect(isPurchaseRequestWorkflowCommand('/tasks')).toBe(false);
  });
});

describe('isChatHomeTrigger', () => {
  it('matches greetings', () => {
    expect(isChatHomeTrigger('hello')).toBe(true);
    expect(isChatHomeTrigger('good morning')).toBe(true);
  });
});
