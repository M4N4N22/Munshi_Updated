import type { WaOutboundMessage } from './outbound-message.types';
import { getTeamCsvTemplateDownloadUrl } from 'src/modules/whatsapp/team-csv.template';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';

/** Owner taps one button → downloads ready-made CSV; no copy-paste in chat. */
export function buildTeamCsvOnboardingCta(): WaOutboundMessage {
  const url = getTeamCsvTemplateDownloadUrl();
  return {
    type: 'interactive_cta_url',
    body: waSection(
      'CSV se team add',
      '*1.* Neeche *Template download* dabayein\n' +
        '*2.* Excel / Google Sheet mein bharein\n' +
        '*3.* *Save as CSV* karke wahi file yahan bhej dein\n\n' +
        '_Phone, role (WORKER/MANAGER), department sahi likhein._\n\n' +
        '*cancel* — band karna ho',
    ),
    displayText: 'Template download',
    url,
  };
}
