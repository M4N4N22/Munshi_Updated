"use client";

import { formatPhoneDisplay } from "@/lib/phone";
import { LoadingState } from "@/components/ui/loading-state";
import { Landmark, Link2, Package, Users, X } from "lucide-react";

export interface ClientEmployee {
  user_id: number;
  name: string | null;
  phone_number: string;
  role: string;
  doj: string | null;
  joined_at: string;
}

export interface ClientInventoryItem {
  id: number;
  sku: string;
  name: string;
  unit: string;
  current_quantity: number;
  reorder_threshold: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ClientDetail {
  factory: {
    id: number;
    name: string;
    address: string | null;
    created_at: string;
    zoho_connected: boolean;
    bank_consent_status: string | null;
  };
  employees: ClientEmployee[];
  inventory: ClientInventoryItem[];
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  WORKER: "Worker",
};

function roleLabel(role: string) {
  return ROLE_LABEL[role] ?? role;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function bankStatus(status: string | null) {
  if (!status) return { text: "Not linked", tone: "muted" as const };
  const s = status.toUpperCase();
  if (["ACTIVE", "COMPLETED", "SUCCESS"].includes(s)) {
    return { text: "Linked", tone: "ok" as const };
  }
  if (["PENDING", "INITIATED"].includes(s)) {
    return { text: status, tone: "warn" as const };
  }
  return { text: status, tone: "muted" as const };
}

function toneClass(tone: "ok" | "warn" | "muted") {
  if (tone === "ok") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (tone === "warn") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-zinc-50 text-zinc-600 border-zinc-200";
}

type ClientDetailPanelProps = {
  detail: ClientDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
};

export function ClientDetailPanel({
  detail,
  loading,
  error,
  onClose,
}: ClientDetailPanelProps) {
  if (loading) {
    return (
      <LoadingState
        className="min-h-[320px] rounded-2xl border border-zinc-200 bg-white p-8"
        minHeight="min-h-[320px]"
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-zinc-800">Select a client</p>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          Team members and inventory for that business will show here.
        </p>
      </div>
    );
  }

  const { factory, employees, inventory } = detail;
  const bank = bankStatus(factory.bank_consent_status);
  const owners = employees.filter((e) => e.role === "OWNER");
  const team = employees.filter((e) => e.role !== "OWNER");

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Client #{factory.id}
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold text-zinc-900">
            {factory.name}
          </h2>
          {factory.address && (
            <p className="mt-1 text-sm text-zinc-500">{factory.address}</p>
          )}
          <p className="mt-2 text-xs text-zinc-400">
            Joined {fmtDate(factory.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 lg:hidden"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 px-5 sm:grid-cols-2 sm:px-6">
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${factory.zoho_connected ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-zinc-50"}`}
        >
          <Link2 className="h-4 w-4 shrink-0 text-zinc-500" />
          <div>
            <p className="text-xs font-medium text-zinc-500">Zoho Inventory</p>
            <p className="text-sm font-semibold text-zinc-900">
              {factory.zoho_connected ? "Connected" : "Not connected"}
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${toneClass(bank.tone)}`}
        >
          <Landmark className="h-4 w-4 shrink-0 opacity-70" />
          <div>
            <p className="text-xs font-medium opacity-80">Setu bank</p>
            <p className="text-sm font-semibold">{bank.text}</p>
          </div>
        </div>
      </div>

      <section className="px-5 sm:px-6">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">
            People ({employees.length})
          </h3>
        </div>

        {employees.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No team members on file.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="hidden px-4 py-3 sm:table-cell">DOJ</th>
                </tr>
              </thead>
              <tbody>
                {[...owners, ...team].map((e) => (
                  <tr
                    key={e.user_id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {e.name?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${e.phone_number}`}
                        className="font-mono text-xs text-emerald-700 hover:underline"
                      >
                        {formatPhoneDisplay(e.phone_number)}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          e.role === "OWNER"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : e.role === "MANAGER"
                              ? "border-blue-200 bg-blue-50 text-blue-800"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600"
                        }`}
                      >
                        {roleLabel(e.role)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                      {e.doj ? fmtDate(e.doj) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="px-5 pb-6 sm:px-6">
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">
            Inventory ({inventory.length})
          </h3>
        </div>

        {inventory.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No inventory items yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Reorder at</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const low =
                    item.reorder_threshold != null &&
                    item.current_quantity <= item.reorder_threshold;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {item.name}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono tabular-nums ${low ? "font-semibold text-amber-700" : "text-zinc-800"}`}
                      >
                        {item.current_quantity}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{item.unit}</td>
                      <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                        {item.reorder_threshold ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {!item.is_active ? (
                          <span className="text-xs text-zinc-400">Inactive</span>
                        ) : low ? (
                          <span className="text-xs font-medium text-amber-700">
                            Low stock
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
