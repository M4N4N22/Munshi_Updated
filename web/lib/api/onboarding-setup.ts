import { apiBaseUrl } from "@/lib/config";
import { apiGet, apiPost, apiPostForm } from "@/lib/api/client";
import type { OnboardingSetupStatus } from "@/lib/api/onboarding";

export function fetchOnboardingSetupStatus(setupToken: string) {
  return apiGet<OnboardingSetupStatus>(
    `/onboarding/setup/status?setup_token=${encodeURIComponent(setupToken)}`,
  );
}

export function skipOnboardingInventory(setupToken: string) {
  return apiPost<{ inventory_status: string }>(
    "/onboarding/setup/inventory/skip",
    { setup_token: setupToken },
  );
}

export function markOnboardingInventoryZoho(setupToken: string) {
  return apiPost<{ inventory_status: string }>(
    "/onboarding/setup/inventory/zoho-complete",
    { setup_token: setupToken },
  );
}

export function skipOnboardingTeam(setupToken: string) {
  return apiPost<{ team_status: string }>(
    "/onboarding/setup/team/skip",
    { setup_token: setupToken },
  );
}

export function completeOnboardingSetup(
  setupToken: string,
  notifyEmployees = true,
) {
  return apiPost<{
    completed: boolean;
    welcomes_sent: number;
    welcomes_failed: number;
  }>("/onboarding/setup/complete", {
    setup_token: setupToken,
    notify_employees: notifyEmployees,
  });
}

export function uploadOnboardingInventoryCsv(setupToken: string, file: File) {
  const form = new FormData();
  form.append("setup_token", setupToken);
  form.append("file", file);
  return apiPostForm<{
    inventory_status: string;
    summary: {
      added: number;
      updated: number;
      failed: number;
      skipped: number;
      categories_created: number;
      locations_created: number;
    };
  }>("/onboarding/setup/inventory/import", form);
}

export function uploadOnboardingTeamCsv(setupToken: string, file: File) {
  const form = new FormData();
  form.append("setup_token", setupToken);
  form.append("file", file);
  return apiPostForm<{
    team_status: string;
    summary: {
      added: number;
      skipped: number;
      failed: number;
      pending_welcome_count: number;
    };
    failed_rows: Array<{ line: number; name: string; detail: string }>;
  }>("/onboarding/setup/team/import", form);
}

export function buildOnboardingZohoAuthorizeUrl(
  factoryId: number,
  userId: number,
): string {
  const params = new URLSearchParams({
    factory_id: String(factoryId),
    user_id: String(userId),
  });
  return `${apiBaseUrl}/integrations/zoho/authorize?${params.toString()}`;
}
