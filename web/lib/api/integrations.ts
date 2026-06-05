import { apiBaseUrl } from "@/lib/config";

export type IntegrationConnectionSummary = {
  id: number;
  provider: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_run_id: number | null;
  last_successful_sync_at: string | null;
};

type ApiEnvelope<T> = {
  data: T;
  meta?: { success?: boolean; message?: string };
};

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T> | T;
  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiEnvelope<T>).data;
  }
  return json as T;
}

export async function fetchIntegrationConnections(
  factoryId: number,
  userId: number,
): Promise<IntegrationConnectionSummary[]> {
  const url = `${apiBaseUrl}/integrations/connections?factory_id=${factoryId}&user_id=${userId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load integration connections");
  }
  return parseJson<IntegrationConnectionSummary[]>(res);
}

export function buildZohoAuthorizeUrl(factoryId: number, userId: number): string {
  const params = new URLSearchParams({
    factory_id: String(factoryId),
    user_id: String(userId),
  });
  return `${apiBaseUrl}/integrations/zoho/authorize?${params.toString()}`;
}

export async function disconnectZohoIntegration(
  factoryId: number,
  userId: number,
  connectionId?: number,
): Promise<{ disconnected: boolean }> {
  const res = await fetch(`${apiBaseUrl}/integrations/zoho/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      factory_id: factoryId,
      user_id: userId,
      connection_id: connectionId,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to disconnect integration");
  }
  return parseJson<{ disconnected: boolean }>(res);
}

export function formatSyncStatus(status: string | null): string {
  if (!status) return "Never synced";
  if (status === "completed") return "Completed";
  if (status === "partial") return "Partial";
  if (status === "failed") return "Failed";
  if (status === "running") return "Running";
  return status;
}

export function formatProviderLabel(provider: string): string {
  if (provider === "zoho_inventory") return "Zoho Inventory";
  if (provider === "zoho_books") return "Zoho Books";
  if (provider === "csv") return "CSV Import";
  return provider;
}

export function formatConnectionStatus(status: string): string {
  if (status === "active") return "Connected";
  if (status === "disconnected") return "Disconnected";
  if (status === "error") return "Error";
  return status;
}
