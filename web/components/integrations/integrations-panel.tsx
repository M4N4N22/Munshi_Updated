"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Link2,
  Link2Off,
  Plug,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  buildZohoAuthorizeUrl,
  disconnectZohoIntegration,
  fetchIntegrationConnections,
  formatConnectionStatus,
  formatProviderLabel,
  formatSyncStatus,
  type IntegrationConnectionSummary,
} from "@/lib/api/integrations";

export type IntegrationsPanelProps = {
  factoryId: number;
  userId: number;
  initialConnections?: IntegrationConnectionSummary[];
  oauthStatus?: string | null;
  oauthReason?: string | null;
};

function zohoConnection(
  connections: IntegrationConnectionSummary[],
): IntegrationConnectionSummary | undefined {
  return connections.find((c) => c.provider === "zoho_inventory");
}

export function IntegrationsPanel({
  factoryId,
  userId,
  initialConnections = [],
  oauthStatus,
  oauthReason,
}: IntegrationsPanelProps) {
  const [connections, setConnections] =
    useState<IntegrationConnectionSummary[]>(initialConnections);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zoho = useMemo(() => zohoConnection(connections), [connections]);
  const isConnected = zoho?.status === "active";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchIntegrationConnections(factoryId, userId);
      setConnections(rows);
    } catch {
      setError("Unexpected server error while loading connections.");
    } finally {
      setLoading(false);
    }
  }, [factoryId, userId]);

  const handleConnect = () => {
    setConnecting(true);
    setError(null);
    window.location.href = buildZohoAuthorizeUrl(factoryId, userId);
  };

  const handleDisconnect = async () => {
    if (!zoho) return;
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectZohoIntegration(factoryId, userId, zoho.id);
      await refresh();
    } catch {
      setError("Unexpected server error while disconnecting.");
    } finally {
      setDisconnecting(false);
    }
  };

  const oauthBanner = useMemo(() => {
    if (oauthStatus === "connected") {
      return (
        <div
          data-testid="oauth-success-banner"
          className="mb-4 flex items-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3 text-sm text-[#25D366]"
        >
          <Plug className="h-4 w-4 shrink-0" />
          Zoho connected successfully.
        </div>
      );
    }
    if (oauthStatus === "error") {
      const message =
        oauthReason === "token_exchange_failed"
          ? "OAuth failed — could not exchange authorization code."
          : oauthReason === "access_denied"
            ? "OAuth failed — access was denied."
            : "OAuth failed — please try again.";
      return (
        <div
          data-testid="oauth-error-banner"
          className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {message}
        </div>
      );
    }
    if (oauthReason === "expired") {
      return (
        <div
          data-testid="oauth-expired-banner"
          className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Connection expired — reconnect Zoho to continue.
        </div>
      );
    }
    return null;
  }, [oauthStatus, oauthReason]);

  return (
    <div className="mx-auto max-w-lg">
      {oauthBanner}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Zoho Inventory</h2>
            <p className="text-sm text-gray-500">
              Connect Zoho Inventory. Scheduled sync runs automatically when enabled.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading || connecting || disconnecting}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Refresh connections"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <dl className="mb-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Provider</dt>
            <dd className="font-medium text-white" data-testid="provider-name">
              {formatProviderLabel("zoho_inventory")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Status</dt>
            <dd
              className={`font-semibold ${isConnected ? "text-[#25D366]" : "text-gray-400"}`}
              data-testid="connection-status"
            >
              {zoho ? formatConnectionStatus(zoho.status) : "Disconnected"}
            </dd>
          </div>
          {zoho?.expires_at && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Token expiry</dt>
              <dd className="text-gray-300" data-testid="token-expiry">
                {new Date(zoho.expires_at).toLocaleString()}
              </dd>
            </div>
          )}
          {isConnected && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Last sync</dt>
                <dd className="text-gray-300" data-testid="last-sync-at">
                  {zoho?.last_sync_at
                    ? new Date(zoho.last_sync_at).toLocaleString()
                    : "Never"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Last sync status</dt>
                <dd className="text-gray-300" data-testid="last-sync-status">
                  {formatSyncStatus(zoho?.last_sync_status ?? null)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Last successful sync</dt>
                <dd className="text-gray-300" data-testid="last-successful-sync">
                  {zoho?.last_successful_sync_at
                    ? new Date(zoho.last_successful_sync_at).toLocaleString()
                    : "None yet"}
                </dd>
              </div>
            </>
          )}
        </dl>

        {error && (
          <p
            data-testid="panel-error"
            className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {isConnected ? (
          <button
            type="button"
            data-testid="disconnect-button"
            onClick={handleDisconnect}
            disabled={disconnecting || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
          >
            {disconnecting ? (
              <>
                <Spinner size="sm" variant="onDark" />
                Disconnecting…
              </>
            ) : (
              <>
                <Link2Off className="h-4 w-4" />
                Disconnect
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            data-testid="connect-button"
            onClick={handleConnect}
            disabled={connecting || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1fba5a] disabled:opacity-50"
          >
            {connecting ? (
              <>
                <Spinner size="sm" className="border-white/20 border-t-white" />
                Connecting…
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Connect Zoho
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
