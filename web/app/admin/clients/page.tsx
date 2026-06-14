"use client";

import {
  ClientDetail,
  ClientDetailPanel,
} from "@/components/admin/client-detail-panel";
import { LoadingState } from "@/components/ui/loading-state";
import { Spinner } from "@/components/ui/spinner";
import { formatPhoneDisplay } from "@/lib/phone";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, RefreshCw, Search, X } from "lucide-react";

interface ClientRow {
  id: number;
  name: string;
  address: string | null;
  created_at: string;
  owner_name: string | null;
  owner_phone: string | null;
  team_members: number;
  inventory_items: number;
  zoho_connected: boolean;
  bank_consent_status: string | null;
}

interface ClientsOverview {
  clients: ClientRow[];
  totals: {
    factories: number;
    with_zoho: number;
    with_bank_consent: number;
    total_team_members: number;
    total_inventory_items: number;
  };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminClientsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ClientsOverview | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchClients = async (key: string = adminKey) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/clients", {
        headers: { "x-admin-key": key },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load clients");
      if (!json?.totals || !Array.isArray(json?.clients)) {
        throw new Error("Unexpected response from server");
      }
      setData(json);
      setAuthed(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = useCallback(
    async (factoryId: number) => {
      setDetailLoading(true);
      setDetailError("");
      setDetail(null);
      try {
        const res = await fetch(`/api/admin/clients/${factoryId}`, {
          headers: { "x-admin-key": adminKey },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load details");
        if (!json?.factory) throw new Error("Unexpected response from server");
        setDetail(json);
      } catch (err: unknown) {
        setDetailError(
          err instanceof Error ? err.message : "Failed to load details",
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [adminKey],
  );

  useEffect(() => {
    if (!selectedId || !authed) return;
    fetchDetail(selectedId);
  }, [selectedId, authed, fetchDetail]);

  const filtered = useMemo(() => {
    if (!data?.clients) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.clients;
    return data.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.owner_name?.toLowerCase().includes(q) ?? false) ||
        (c.owner_phone?.includes(q) ?? false),
    );
  }, [data, search]);

  const selectClient = (id: number) => {
    setSelectedId(id);
  };

  if (!authed) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-emerald-700">Internal</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Clients dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Onboarded businesses — team, inventory, Zoho, and bank status.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchClients(adminKey);
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-800">Admin key</span>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key"
              className="min-h-12 rounded-xl border border-zinc-300 px-3 text-base text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !adminKey}
            className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="border-white/20 border-t-white" />
                Opening…
              </span>
            ) : (
              "Open dashboard"
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Clients</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Onboarded businesses
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {data?.totals.factories ?? 0} factories · select one to view team and
            inventory
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchClients()}
          disabled={loading}
          className="flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {data?.totals && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Clients", value: data.totals.factories },
            { label: "Team", value: data.totals.total_team_members },
            { label: "SKUs", value: data.totals.total_inventory_items },
            { label: "Zoho", value: data.totals.with_zoho },
            { label: "Bank", value: data.totals.with_bank_consent },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
            >
              <dt className="text-xs font-medium text-zinc-500">{s.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business, owner, phone…"
              className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white pl-9 pr-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="max-h-[min(70vh,640px)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white">
            {loading && !data ? (
              <LoadingState className="py-12" size="sm" minHeight="min-h-[8rem]" />
            ) : filtered.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                No clients found.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {filtered.map((c) => {
                  const selected = selectedId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectClient(c.id)}
                        className={`flex w-full items-start gap-2 px-4 py-3.5 text-left transition ${
                          selected
                            ? "bg-emerald-50/80"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {c.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {c.owner_name || "No owner"}
                            {c.owner_phone
                              ? ` · ${formatPhoneDisplay(c.owner_phone)}`
                              : ""}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-400">
                            {c.team_members} team · {c.inventory_items} SKUs ·{" "}
                            {fmtDate(c.created_at)}
                          </p>
                        </div>
                        <ChevronRight
                          className={`mt-1 h-4 w-4 shrink-0 ${selected ? "text-emerald-600" : "text-zinc-300"}`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className={selectedId ? "block" : "hidden lg:block"}>
          <ClientDetailPanel
            detail={detail}
            loading={detailLoading}
            error={detailError}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}
