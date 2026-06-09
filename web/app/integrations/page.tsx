"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Plug } from "lucide-react";
import { IntegrationsPanel } from "@/components/integrations/integrations-panel";
import {
  fetchIntegrationConnections,
  type IntegrationConnectionSummary,
} from "@/lib/api/integrations";

function IntegrationsPageInner() {
  const searchParams = useSearchParams();
  const factoryId = Number(searchParams.get("factory_id") ?? "");
  const userId = Number(searchParams.get("user_id") ?? "");
  const oauthStatus = searchParams.get("status");
  const oauthReason = searchParams.get("reason");

  const [connections, setConnections] = useState<IntegrationConnectionSummary[]>(
    [],
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(factoryId) || factoryId <= 0) return;
    if (!Number.isFinite(userId) || userId <= 0) return;
    fetchIntegrationConnections(factoryId, userId)
      .then(setConnections)
      .catch(() => setLoadError("Could not load integrations for your company."));
  }, [factoryId, userId]);

  const invalidContext =
    !Number.isFinite(factoryId) ||
    factoryId <= 0 ||
    !Number.isFinite(userId) ||
    userId <= 0;

  return (
    <div className="min-h-screen bg-[#0f1a14] text-white">
      <div className="border-b border-white/10 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]">
            <Plug className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight sm:text-lg">
              Integrations
            </h1>
            <p className="text-xs text-gray-500">Connect external systems</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {invalidContext ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-6 text-sm text-amber-200">
            Open this page from the link in WhatsApp (owner or manager account).
            If you landed here directly, go back to Munshi on WhatsApp and use
            the integrations option from your menu.
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-6 text-sm text-red-300">
            {loadError}
          </div>
        ) : (
          <IntegrationsPanel
            factoryId={factoryId}
            userId={userId}
            initialConnections={connections}
            oauthStatus={oauthStatus}
            oauthReason={oauthReason}
          />
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f1a14] text-gray-500">
          Loading...
        </div>
      }
    >
      <IntegrationsPageInner />
    </Suspense>
  );
}
