import type { WaOutboundMessage, WaReplyButton } from './outbound-message.types';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import { WA_INTERACTIVE_ID } from './whatsapp-interactive.constants';

export function buildEmptyTeamSetupButtons(): WaReplyButton[] {
  return [
    {
      id: WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM,
      title: 'Google Form se add',
    },
    {
      id: WA_INTERACTIVE_ID.TEAM_DASHBOARD,
      title: 'Dashboard par add',
    },
    {
      id: WA_INTERACTIVE_ID.TEAM_ONBOARD_WA,
      title: 'WhatsApp par add',
    },
  ];
}

export function appendTeamSetupLinkHints(bodyText: string): string {
  const formUrl = getOnboardWorkerGoogleFormUrl();
  const dashboardUrl = getTeamDashboardUrl();
  const lines: string[] = [];
  if (formUrl) {
    lines.push(`📋 *Google Form:* ${formUrl}`);
  }
  if (dashboardUrl) {
    lines.push(`🖥️ *Dashboard:* ${dashboardUrl}`);
  }
  if (!lines.length) {
    return bodyText;
  }
  return `${bodyText}\n\n${lines.join('\n')}`;
}

export function buildEmptyTeamSetupOutbound(bodyText: string): WaOutboundMessage {
  const body = appendTeamSetupLinkHints(bodyText);
  return {
    type: 'interactive_buttons',
    body,
    buttons: buildEmptyTeamSetupButtons(),
  };
}

function readEnvUrl(key: string): string | null {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return null;
  }
  const url = raw.replace(/^["']|["']$/g, '').trim();
  return url || null;
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
  return readEnvUrl('ONBOARD_WORKER_GOOGLE_FORM_URL');
}

export function getTeamDashboardUrl(): string | null {
  return (
    readEnvUrl('MUNSHI_TEAM_DASHBOARD_URL') ||
    readEnvUrl('MUNSHI_DASHBOARD_URL')
  );
}
