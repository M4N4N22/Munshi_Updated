import type { WaOutboundMessage, WaReplyButton } from './outbound-message.types';

/** processCommand / finish: reply already sent (e.g. multi-message home). */
export const WA_OUTBOUND_ALREADY_SENT = Symbol('wa_outbound_already_sent');

export type BusinessReadinessSnapshot = {
  businessName: string;
  employeeCount: number;
  stockItemCount: number;
  hasEmployees: boolean;
};

import {
  waAssignTaskNeedEmployees,
  waAssignTaskReady,
  waEmployeeAddMenuIntro,
  waOwnerDemoLinks,
  waOwnerWelcomeIntro,
  waUnrecognizedChat,
} from './owner-home.templates';
import { buildEmployeeAddButtons } from './team-setup-outbound';
import { WA_INTERACTIVE_ID } from './whatsapp-interactive.constants';

export function getBookDemoUrl(): string | null {
  return readEnvUrl('MUNSHI_BOOK_DEMO_URL') || readEnvUrl('NEXT_PUBLIC_BOOK_DEMO_URL');
}

export function getDemoYoutubeUrl(): string | null {
  return (
    readEnvUrl('MUNSHI_DEMO_YOUTUBE_URL') ||
    readEnvUrl('NEXT_PUBLIC_YOUTUBE_URL')
  );
}

function readEnvUrl(key: string): string | null {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return null;
  }
  const url = raw.replace(/^["']|["']$/g, '').trim();
  return url || null;
}

export function buildOwnerHomeMainButtons(): WaReplyButton[] {
  return [
    {
      id: WA_INTERACTIVE_ID.HOME_ADD_EMPLOYEE,
      title: 'Employee jodiyein',
    },
    {
      id: WA_INTERACTIVE_ID.HOME_ADD_STOCK,
      title: 'Maal / stock jodein',
    },
    {
      id: WA_INTERACTIVE_ID.HOME_ASSIGN_TASK,
      title: 'Kaam assign karein',
    },
  ];
}

export function buildOwnerHomeSecondaryButtons(): WaReplyButton[] {
  return [
    {
      id: WA_INTERACTIVE_ID.HOME_SHOW_HELP,
      title: 'Saari commands',
    },
    {
      id: WA_INTERACTIVE_ID.HOME_STOCK_STATUS,
      title: 'Stock dikhao',
    },
    {
      id: WA_INTERACTIVE_ID.HOME_SHOW_TEAM,
      title: 'Team list',
    },
  ];
}

export function buildOwnerHomeWelcomeText(
  userName: string,
  readiness: BusinessReadinessSnapshot,
): string {
  return waOwnerWelcomeIntro({
    userName,
    businessName: readiness.businessName,
    employeeCount: readiness.employeeCount,
    stockItemCount: readiness.stockItemCount,
  });
}

export function buildOwnerHomeDemoText(): string {
  return waOwnerDemoLinks(getBookDemoUrl(), getDemoYoutubeUrl());
}

/** Welcome + demo are sent as separate texts; this is the button card body only. */
export function buildOwnerHomeMenuOutbound(
  readiness: BusinessReadinessSnapshot,
): WaOutboundMessage {
  const statusBits: string[] = [];
  if (readiness.hasEmployees) {
    statusBits.push(`${readiness.employeeCount} employee`);
  }
  if (readiness.stockItemCount > 0) {
    statusBits.push(`${readiness.stockItemCount} maal`);
  }
  const hint = statusBits.length
    ? `_(${statusBits.join(' · ')} jud chuka hai)_\n\n`
    : '';

  return {
    type: 'interactive_buttons',
    body: `${hint}*Setup aur rozmarra* 👇`,
    buttons: buildOwnerHomeMainButtons(),
  };
}

/** Second row — browse, status, full command guide (WhatsApp max 3 buttons per card). */
export function buildOwnerHomeSecondaryMenuOutbound(): WaOutboundMessage {
  return {
    type: 'interactive_buttons',
    body: '*Dekhein aur commands* — help mein poori list 👇',
    buttons: buildOwnerHomeSecondaryButtons(),
  };
}

export function buildEmployeeAddMenuOutbound(): WaOutboundMessage {
  return {
    type: 'interactive_buttons',
    body: waEmployeeAddMenuIntro(),
    buttons: buildEmployeeAddButtons(),
  };
}

export function buildAssignBlockedOutbound(): WaOutboundMessage {
  return {
    type: 'interactive_buttons',
    body: waAssignTaskNeedEmployees(),
    buttons: buildEmployeeAddButtons(),
  };
}

export function buildAssignReadyOutbound(): WaOutboundMessage {
  return { type: 'text', body: waAssignTaskReady() };
}

export function buildGoHomeButton(): WaReplyButton {
  return {
    id: WA_INTERACTIVE_ID.HOME_GO_HOME,
    title: 'Home par jayein',
  };
}

/** When ML/command did not match — chat-first nudge, not /help. */
export function buildUnrecognizedChatOutbound(): WaOutboundMessage {
  return {
    type: 'interactive_buttons',
    body: waUnrecognizedChat(),
    buttons: [buildGoHomeButton()],
  };
}
