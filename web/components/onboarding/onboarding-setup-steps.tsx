"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { LoadingState } from "@/components/ui/loading-state";
import { Spinner } from "@/components/ui/spinner";
import type { OnboardingSetupStatus } from "@/lib/api/onboarding";
import {
  completeOnboardingSetup,
  fetchOnboardingSetupStatus,
  previewOnboardingInventoryCsv,
  previewOnboardingTeamCsv,
  skipOnboardingInventory,
  skipOnboardingTeam,
  uploadOnboardingInventoryCsv,
  uploadOnboardingTeamCsv,
  type OnboardingInventoryPreview,
  type OnboardingTeamPreview,
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
  wide = false,
  children,
}: {
  step: number;
  total: number;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex w-full flex-col gap-6 ${wide ? "max-w-4xl" : "max-w-lg"}`}
    >
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
}: {
  ctx: SetupContext;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<OnboardingSetupStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OnboardingInventoryPreview | null>(
    null,
  );
  const [previewing, setPreviewing] = useState(false);
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

  const csvImported = (status?.stock_item_count ?? 0) > 0;

  useEffect(() => {
    refresh().catch(() =>
      setError("Could not load setup status. Try refreshing."),
    );
  }, [refresh]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    setError(null);
    previewOnboardingInventoryCsv(ctx.setupToken, file)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPreview(null);
          setError(
            err instanceof ApiError ? err.message : "Could not preview CSV.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file, ctx.setupToken]);

  async function handleConfirmImport() {
    if (!file || !preview) {
      setError("Pehle CSV file chunein aur preview dekhein.");
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
      setPreview(null);
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

  if (!status && !error) {
    return (
      <StepShell step={2} total={4} title="Add your inventory" wide>
        <LoadingState className="min-h-[24vh] w-full" />
      </StepShell>
    );
  }

  return (
    <StepShell step={2} total={4} title="Add your inventory" wide>
      <p className="text-sm leading-relaxed text-zinc-600">
        Upload a stock CSV for{" "}
        <span className="font-medium text-zinc-800">{ctx.companyName}</span>, or
        skip and add items later on WhatsApp.
      </p>

      {inventoryDone ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
          <p className="font-semibold">Inventory step complete</p>
          <p className="mt-1 text-emerald-900/90">
            {csvImported
              ? `${status?.stock_item_count ?? 0} stock items in Munshi.`
              : status?.inventory_status === "skipped"
                ? "Skipped for now — add stock on WhatsApp anytime."
                : "Ready to continue."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-800">Upload CSV</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              Download the template or use your own export — we accept column
              names like item_code, qty, godown. Preview appears before import.
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
              Download template
            </a>
            <a
              href="/inventory-import/test-samples/05-quick-smoke-3-items.csv"
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Try sample CSV (3 items)
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
                  setMessage(null);
                }}
                className="sr-only"
              />
            </label>

            {previewing && (
              <LoadingState
                className="min-h-[8rem] w-full rounded-xl border border-zinc-100 bg-zinc-50/80"
                size="sm"
                label="Reading CSV…"
              />
            )}

            {preview && !previewing && (
              <InventoryCsvPreview data={preview} />
            )}

            <button
              type="button"
              disabled={busy || !file || !preview || previewing}
              onClick={handleConfirmImport}
              className="flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner
                    size="sm"
                    className="border-white/20 border-t-white"
                  />
                  Importing…
                </span>
              ) : (
                "Confirm import"
              )}
            </button>
          </div>

          <div className="flex items-center justify-center md:flex-col md:px-1">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              or
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-zinc-700">
                Zoho Inventory
              </p>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Coming soon
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              Sync stock directly from Zoho Inventory. We&apos;re finishing this
              integration — use CSV upload for now.
            </p>
            <button
              type="button"
              disabled
              className="flex h-11 cursor-not-allowed items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-400"
            >
              Connect Zoho
            </button>
          </div>
        </div>
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

function InventoryCsvPreview({ data }: { data: OnboardingInventoryPreview }) {
  const { review } = data;
  const newItemCount = review.newItems.length;
  const existingItemCount = review.existingItems.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
      <div className="text-xs leading-relaxed text-emerald-950">
        <p className="font-semibold">
          Preview — {data.row_count} item{data.row_count === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-emerald-900/90">
          {newItemCount} new · {existingItemCount} existing
          {review.newCategories.length > 0
            ? ` · ${review.newCategories.length} new categor${review.newCategories.length === 1 ? "y" : "ies"}`
            : ""}
          {review.newLocations.length > 0
            ? ` · ${review.newLocations.length} new location${review.newLocations.length === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-emerald-100 bg-white">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
              <th className="px-2 py-2 font-medium">SKU</th>
              <th className="px-2 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 font-medium">Location</th>
              <th className="px-2 py-2 font-medium text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.preview_rows.map((row) => (
              <tr key={row.line} className="border-b border-zinc-50 last:border-0">
                <td className="px-2 py-2 font-mono text-zinc-700">{row.sku}</td>
                <td className="max-w-[8rem] truncate px-2 py-2 text-zinc-800">
                  {row.name}
                </td>
                <td className="max-w-[6rem] truncate px-2 py-2 text-zinc-600">
                  {row.category}
                </td>
                <td className="max-w-[6rem] truncate px-2 py-2 text-zinc-600">
                  {row.location}
                </td>
                <td className="px-2 py-2 text-right text-zinc-800">
                  {row.quantity} {row.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.has_more_rows && (
        <p className="text-xs text-zinc-500">
          Showing first {data.preview_rows.length} of {data.row_count} rows.
        </p>
      )}
    </div>
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
  const [preview, setPreview] = useState<OnboardingTeamPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [notifyEmployees, setNotifyEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = await fetchOnboardingSetupStatus(ctx.setupToken);
    setStatus(s);
    return s;
  }, [ctx.setupToken]);

  const employeeCount = status?.employee_count ?? 0;
  const pendingWelcomeCount = status?.pending_welcome_count ?? 0;
  const hasTeamMembers = employeeCount > 0 || pendingWelcomeCount > 0;
  const teamDone =
    status?.team_status === "skipped" ||
    (status?.team_status === "completed" && hasTeamMembers);

  useEffect(() => {
    refresh().catch(() => setError("Could not load setup status."));
  }, [refresh]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    setError(null);
    previewOnboardingTeamCsv(ctx.setupToken, file)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPreview(null);
          setError(
            err instanceof ApiError ? err.message : "Could not preview CSV.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file, ctx.setupToken]);

  async function handleConfirmImport() {
    if (!file || !preview) {
      setError("Pehle CSV file chunein aur preview dekhein.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await uploadOnboardingTeamCsv(ctx.setupToken, file);
      const failHint =
        res.failed_rows?.length > 0
          ? ` Failed rows: ${res.failed_rows
              .map((r) => `row ${r.line} (${r.detail})`)
              .join("; ")}.`
          : "";
      setMessage(
        `Team import — Added: ${res.summary.added}, Skipped: ${res.summary.skipped}, Failed: ${res.summary.failed}.` +
          `${res.summary.pending_welcome_count} employees will get WhatsApp welcome when you finish.${failHint}`,
      );
      setFile(null);
      setPreview(null);
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
    if (file && preview && !teamDone) {
      setError(
        "Preview ≠ import. Pehle Confirm import dabayein, phir Finish setup.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!teamDone) {
        await skipOnboardingTeam(ctx.setupToken);
      }
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

  if (!status && !error) {
    return (
      <StepShell step={3} total={4} title="Add your team">
        <LoadingState className="min-h-[24vh] w-full" />
      </StepShell>
    );
  }

  return (
    <StepShell step={3} total={4} title="Add your team">
      <p className="text-sm leading-relaxed text-zinc-600">
        Upload employees for{" "}
        <span className="font-medium text-zinc-800">{ctx.companyName}</span>{" "}
        (name, phone, role, department). Preview before import — welcomes go out
        when you finish setup.
      </p>

      {teamDone ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
          <p className="font-semibold">Team step complete</p>
          <p className="mt-1 text-emerald-900/90">
            {status?.team_status === "skipped"
              ? "Skipped for now — add employees on WhatsApp anytime."
              : `${employeeCount} employee${employeeCount === 1 ? "" : "s"} in Munshi${
                  pendingWelcomeCount > 0
                    ? ` · ${pendingWelcomeCount} pending welcome`
                    : ""
                }.`}
          </p>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-800">Upload team CSV</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              Download the template, add name, phone, role, and department. A
              preview appears before you confirm.
            </p>
            <a
              href={
                status?.team_template_url ?? "/team-import/munshi-team-template.csv"
              }
              className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download team template
            </a>
            <a
              href="/team-import/test-samples/01-quick-smoke-2-employees.csv"
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Try sample CSV (2 employees)
            </a>
            <a
              href="/team-import/test-samples/README.md"
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              All test samples (8 files)
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
                  setMessage(null);
                }}
                className="sr-only"
              />
            </label>

            {previewing && (
              <LoadingState
                className="min-h-[8rem] w-full rounded-xl border border-zinc-100 bg-zinc-50/80"
                size="sm"
                label="Reading CSV…"
              />
            )}

            {preview && !previewing && <TeamCsvPreview data={preview} />}

            {preview && !previewing && !teamDone && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                Preview sirf check hai — employees tabhi judenge jab aap{" "}
                <span className="font-semibold">Confirm import</span> dabayein.
              </p>
            )}

            <button
              type="button"
              disabled={busy || !file || !preview || previewing}
              onClick={handleConfirmImport}
              className="flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner
                    size="sm"
                    className="border-white/20 border-t-white"
                  />
                  Importing…
                </span>
              ) : (
                "Confirm import"
              )}
            </button>
          </div>
        </div>
      )}

      <label className="mx-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={notifyEmployees}
          onChange={(e) => setNotifyEmployees(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Employees ko WhatsApp par welcome message bhejein jab main setup
          complete karun
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
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="border-white/20 border-t-white" />
              Finishing…
            </span>
          ) : (
            "Finish setup"
          )}
        </button>
        {!teamDone && (
          <button
            type="button"
            disabled={busy}
            onClick={handleSkip}
            className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800"
          >
            Skip team import
          </button>
        )}
      </div>
    </StepShell>
  );
}

function TeamCsvPreview({ data }: { data: OnboardingTeamPreview }) {
  const { summary } = data;
  const deptLabel =
    summary.departments.length > 0
      ? summary.departments.slice(0, 3).join(", ") +
        (summary.departments.length > 3
          ? ` +${summary.departments.length - 3}`
          : "")
      : "—";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
      <div className="text-xs leading-relaxed text-emerald-950">
        <p className="font-semibold">
          Preview — {data.row_count} employee
          {data.row_count === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-emerald-900/90">
          {summary.workers} worker{summary.workers === 1 ? "" : "s"} ·{" "}
          {summary.managers} manager{summary.managers === 1 ? "" : "s"} ·{" "}
          {deptLabel}
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-emerald-100 bg-white">
        <table className="w-full min-w-[360px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Phone</th>
              <th className="px-2 py-2 font-medium">Role</th>
              <th className="px-2 py-2 font-medium">Dept</th>
            </tr>
          </thead>
          <tbody>
            {data.preview_rows.map((row) => (
              <tr key={row.line} className="border-b border-zinc-50 last:border-0">
                <td className="max-w-[7rem] truncate px-2 py-2 text-zinc-800">
                  {row.name}
                </td>
                <td className="px-2 py-2 font-mono text-zinc-600">{row.phone}</td>
                <td className="px-2 py-2 text-zinc-600">{row.role}</td>
                <td className="max-w-[5rem] truncate px-2 py-2 text-zinc-600">
                  {row.department}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.has_more_rows && (
        <p className="text-xs text-zinc-500">
          Showing first {data.preview_rows.length} of {data.row_count} rows.
        </p>
      )}
    </div>
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
