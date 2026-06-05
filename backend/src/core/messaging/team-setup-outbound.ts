import type { WaOutboundMessage, WaReplyButton } from './outbound-message.types';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import { WA_INTERACTIVE_ID } from './whatsapp-interactive.constants';

export function buildEmployeeAddButtons(): WaReplyButton[] {
  return [
    {
      id: WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
      title: 'WhatsApp par add',
    },
    {
      id: WA_INTERACTIVE_ID.HOME_BULK_CSV,
      title: 'CSV se bulk add',
    },
  ];
}

/** @deprecated Use buildEmployeeAddButtons */
export function buildEmptyTeamSetupButtons(): WaReplyButton[] {
  return buildEmployeeAddButtons();
}

export function buildEmployeeAddMenuOutbound(bodyText?: string): WaOutboundMessage {
  const body =
    bodyText ??
    waSection(
      'Employee jodiyein',
      'Chhoti team — *WhatsApp par add* (ek ek karke).\n' +
        'Zyada log — *CSV se bulk add* (template download, file yahan bhejein).\n\n' +
        '_Website dashboard jald aa raha hai._',
    );
  return {
    type: 'interactive_buttons',
    body,
    buttons: buildEmployeeAddButtons(),
  };
}

export function buildEmptyTeamSetupOutbound(bodyText: string): WaOutboundMessage {
  return buildEmployeeAddMenuOutbound(bodyText);
}

/** Plain-text reply with URL (GetOlli rejects interactive cta_url with 500). */
export function buildTeamSetupLinkReply(
  heading: string,
  intro: string,
  url: string,
): string {
  return waSection(heading, `${intro}\n\n👉 ${url}`);
}

export function getOnboardWorkerGoogleFormUrl(): string | null {
  const raw = process.env.ONBOARD_WORKER_GOOGLE_FORM_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/^["']|["']$/g, '').trim() || null;
}

export function getTeamDashboardUrl(): string | null {
  const raw =
    process.env.MUNSHI_TEAM_DASHBOARD_URL?.trim() ||
    process.env.MUNSHI_DASHBOARD_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/^["']|["']$/g, '').trim() || null;
}
