import type { ZohoPullSyncSummary } from './zoho-pull-sync.types';

/** WhatsApp-style summary — mirrors inventory CSV import format. */
export function formatZohoPullSummaryMessage(
  summary: ZohoPullSyncSummary,
): string {
  const header =
    summary.failedCount > 0
      ? '⚠️ Zoho sync complete'
      : '✅ Zoho sync complete';

  let body =
    `\n\nAdded: ${summary.addedCount}\n` +
    `Updated: ${summary.updatedCount}\n` +
    `Failed: ${summary.failedCount}\n` +
    `Mappings: ${summary.mappingCount}`;

  body += `\n\nSync Run:\n#${summary.syncRunId}`;

  if (summary.failedCount > 0 && summary.failures?.length) {
    body += '\n\nKuch items sync nahi ho paaye.';
    const lines = summary.failures.slice(0, 8).map(
      (f) => `• ${f.externalId} (${f.sku}): ${f.detail}`,
    );
    if (lines.length) {
      body += `\n\n${lines.join('\n')}`;
    }
    if (summary.failures.length > 8) {
      body += `\n• ...aur ${summary.failures.length - 8} errors`;
    }
  }

  return `${header}${body}`;
}
