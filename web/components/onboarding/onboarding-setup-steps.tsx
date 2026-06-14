"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { OnboardingSetupStatus } from "@/lib/api/onboarding";
import {
  buildOnboardingZohoAuthorizeUrl,
  completeOnboardingSetup,
  fetchOnboardingSetupStatus,
  markOnboardingInventoryZoho,
  skipOnboardingInventory,
  skipOnboardingTeam,
  uploadOnboardingInventoryCsv,
  uploadOnboardingTeamCsv,
} from "@/lib/api/onboarding-setup";
import { formatPhoneDisplay } from "@/lib/phone";

const SETUP_SESSION_KEY = "munshi_onboarding_setup";

export type PersistedOnboardingSetup = {
  setupToken: string;
  factoryId: number;
  userId: number;
  phone: string;
  companyName: string;
  step: "inventory" | "team" | "ready";
};

export function saveOnboardingSetupSession(data: PersistedOnboardingSetup) {
  sessionStorage.setItem(SETUP_SESSION_KEY, JSON.stringify(data));
}

export function loadOnboardingSetupSession(): PersistedOnboardingSetup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SETUP_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedOnboardingSetup;
  } catch {
    return null;
  }
}

export function clearOnboardingSetupSession() {
  sessionStorage.removeItem(SETUP_SESSION_KEY);
}

type SetupContext = {
  setupToken: string;
  factoryId: number;
  userId: number;
  phone: string;
  companyName: string;
};

function StepShell({
  step,
  total,
  title,
  children,
}: {
  step: number;
  total: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">
          Step {step} of {total}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function OnboardingInventoryStep({
  ctx,
  onContinue,
  onBack,
  zohoReturn = false,
}: {
  ctx: SetupContext;
  onContinue: () => void;
  onBack: () => void;
  zohoReturn?: boolean;
}) {
  const [status, setStatus] = useState<OnboardingSetupStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = await fetchOnboardingSetupStatus(ctx.setupToken);
    setStatus(s);
    return s;
  }, [ctx.setupToken]);

  const inventoryDone =
    status?.inventory_status === "completed" ||
    status?.inventory_status === "skipped" ||
    (status?.stock_item_count ?? 0) > 0;

  const zohoActive = Boolean(status?.zoho_connected);
  const csvImported = (status?.stock_item_count ?? 0) > 0;

  useEffect(() => {
    refresh().catch(() =>
      setError("Could not load setup status. Try refreshing."),
    );
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      refresh().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!zohoReturn) return;
    refresh()
      .then((s) => {
        if (s.zoho_connected) {
          setMessage(
            "Zoho Inventory connected. Stock will sync from Zoho — you can continue to team setup.",
          );
        }
      })
      .catch(() => {});
  }, [zohoReturn, refresh]);

  useEffect(() => {
    if (!status?.zoho_connected || status.inventory_status !== "pending") {
      return;
    }
    markOnboardingInventoryZoho(ctx.setupToken)
      .then(() => refresh())
      .then(() =>
        setMessage(
          "Zoho Inventory connected. Stock will sync from Zoho — you can continue to team setup.",
        ),
      )
      .catch(() => {});
  }, [status?.zoho_connected, status?.inventory_status, ctx.setupToken, refresh]);

  async function handleUpload() {
    if (!file) {
      setError("Pehle CSV file chunein.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await uploadOnboardingInventoryCsv(ctx.setupToken, file);
      setMessage(
        `Import complete — Added: ${res.summary.added}, Updated: ${res.summary.updated}, Failed: ${res.summary.failed}`,
      );
      setFile(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    setError(null);
    try {
      await skipOnboardingInventory(ctx.setupToken);
      await refresh();
      onContinue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not skip.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepShell step={2} total={4} title="Add your inventory">
      <p className="text-sm leading-relaxed text-zinc-600">
        Choose one way to get stock into Munshi for{" "}
        <span className="font-medium text-zinc-800">{ctx.companyName}</span>.
        You can skip and add items later on WhatsApp.
      </p>

      {inventoryDone ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
          <p className="font-semibold">Inventory step complete</p>
          <p className="mt-1 text-emerald-900/90">
            {zohoActive && !csvImported
              ? "Zoho Inventory is connected — Munshi will sync your stock from Zoho."
              : csvImported
                ? `${status?.stock_item_count ?? 0} stock items in Munshi.`
                : status?.inventory_status === "skipped"
                  ? "Skipped for now — add stock on WhatsApp anytime."
                  : "Ready to continue."}
          </p>
        </div>
      ) : status ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <p>
            Pick <strong>CSV upload</strong> or <strong>connect Zoho</strong>{" "}
            below. Upload stays available even after Zoho is connected.
          </p>
          {zohoActive && (
            <p className="mt-2 text-emerald-800">
              Zoho is connected — tap <strong>Continue to team</strong> when
              ready.
            </p>
          )}
        </div>
      ) : null}

      {!inventoryDone && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-800">
              Option A — Upload CSV
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              Download the template, fill in your items, then choose the file.
              Your Excel export may use different column names (e.g. item_code,
              qty, godown) — we map those automatically. The upload button
              enables after you select a .csv file.
            </p>
            <a
              href={
                status?.inventory_template_url ??
                "/inventory-import/munshi-inventory-template.csv"
              }
              className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download inventory template
            </a>
            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-4 hover:border-emerald-400 hover:bg-emerald-50/40">
              <span className="text-sm font-medium text-zinc-800">
                {file ? file.name : "Choose CSV file"}
              </span>
              <span className="text-xs text-zinc-500">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB selected`
                  : "Click to browse — .csv only"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              disabled={busy || !file}
              onClick={handleUpload}
              className="flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Uploading…" : "Upload inventory CSV"}
            </button>
            {!file && (
              <p className="text-xs text-zinc-500">
                Select a file above to enable upload.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-800">
              Option B — Zoho Inventory
            </p>
            {zohoActive ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold">Zoho Inventory connected</p>
                <p className="mt-1 text-emerald-800/90">
                  Munshi will pull stock from Zoho. No CSV needed unless you
                  want extra local items.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-zinc-500">
                  Already use Zoho Inventory? Connect once — we&apos;ll sync
                  items automatically. You&apos;ll return here when done.
                </p>
                <a
                  href={buildOnboardingZohoAuthorizeUrl(
                    ctx.factoryId,
                    ctx.userId,
                  )}
                  className="flex h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Connect Zoho Inventory
                </a>
              </>
            )}
          </div>
        </>
      )}

      {message && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700"
        >
          Back
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onContinue}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50"
        >
          {inventoryDone ? "Continue to team" : "Continue anyway"}
        </button>
        {!inventoryDone && (
          <button
            type="button"
            disabled={busy}
            onClick={handleSkip}
            className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800"
          >
            Skip for now
          </button>
        )}
      </div>
    </StepShell>
  );
}

export function OnboardingTeamStep({
  ctx,
  onContinue,
  onBack,
}: {
  ctx: SetupContext;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<OnboardingSetupStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notifyEmployees, setNotifyEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchOnboardingSetupStatus(ctx.setupToken)
      .then(setStatus)
      .catch(() => setError("Could not load setup status."));
  }, [ctx.setupToken]);

  async function handleUpload() {
    if (!file) {
      setError("Pehle team CSV file chunein.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await uploadOnboardingTeamCsv(ctx.setupToken, file);
      setMessage(
        `Team import — Added: ${res.summary.added}, Skipped: ${res.summary.skipped}, Failed: ${res.summary.failed}. ` +
          `${res.summary.pending_welcome_count} employees will get WhatsApp welcome when you finish.`,
      );
      const s = await fetchOnboardingSetupStatus(ctx.setupToken);
      setStatus(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    setError(null);
    try {
      await skipOnboardingTeam(ctx.setupToken);
      await completeOnboardingSetup(ctx.setupToken, notifyEmployees);
      onContinue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not skip.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setBusy(true);
    setError(null);
    try {
      const res = await completeOnboardingSetup(ctx.setupToken, notifyEmployees);
      setMessage(
        res.welcomes_sent > 0
          ? `${res.welcomes_sent} employees ko welcome message bheja gaya.`
          : "Setup complete.",
      );
      onContinue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not finish setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepShell step={3} total={4} title="Add your team">
      <p className="text-sm leading-relaxed text-zinc-600">
        Upload employees for{" "}
        <span className="font-medium text-zinc-800">{ctx.companyName}</span>{" "}
        (name, phone, role, department). New members get a WhatsApp welcome when
        you finish.
      </p>

      {status && (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Employees: <strong>{status.employee_count}</strong>
          {status.pending_welcome_count > 0
            ? ` · ${status.pending_welcome_count} pending welcome`
            : ""}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4">
        <a
          href={status?.team_template_url ?? "/team-import/munshi-team-template.csv"}
          className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download team template
        </a>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-700"
        />
        <button
          type="button"
          disabled={busy || !file}
          onClick={handleUpload}
          className="flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload team CSV"}
        </button>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={notifyEmployees}
          onChange={(e) => setNotifyEmployees(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Employees ko WhatsApp par welcome message bhejein jab main setup complete
          karun
        </span>
      </label>

      {message && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700"
        >
          Back
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleFinish}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Finishing…" : "Finish setup"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleSkip}
          className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800"
        >
          Skip team import
        </button>
      </div>
    </StepShell>
  );
}

export function OnboardingReadyStep({
  ctx,
  whatsappReady,
  whatsappConfigMissing,
  onReset,
}: {
  ctx: SetupContext;
  whatsappReady: boolean;
  whatsappConfigMissing: boolean;
  onReset: () => void;
}) {
  const WHATSAPP_HREF = "/api/whatsapp?text=START";

  return (
    <StepShell step={4} total={4} title="You're ready for WhatsApp">
      {whatsappConfigMissing && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          WhatsApp link is not configured yet. Add WHATSAPP_BUSINESS_NUMBER to
          .env.local and restart the dev server.
        </p>
      )}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Setup complete
        </p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">
          <span className="font-medium">{formatPhoneDisplay(ctx.phone)}</span> ·{" "}
          <span className="font-medium">{ctx.companyName}</span>
          <br />
          Open Munshi on WhatsApp and send{" "}
          <span className="font-mono font-medium">START</span> or{" "}
          <span className="font-mono font-medium">namaste</span> to manage tasks,
          inventory, and your team.
        </p>
      </div>

      {whatsappReady ? (
        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => clearOnboardingSetupSession()}
          className="flex h-12 items-center justify-center rounded-xl bg-[#25D366] px-6 text-base font-semibold text-white shadow-sm transition hover:bg-[#1da851]"
        >
          Open WhatsApp
        </a>
      ) : (
        <a
          href={WHATSAPP_HREF}
          className="text-center text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          Try Open WhatsApp anyway
        </a>
      )}

      <button
        type="button"
        onClick={onReset}
        className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
      >
        Use a different number
      </button>
    </StepShell>
  );
}
