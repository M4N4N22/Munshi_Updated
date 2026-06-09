"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Link2,
  Package,
  RefreshCw,
  Search,
  Shield,
  Users,
  Landmark,
  X,
} from "lucide-react";

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

function StatusPill({
  ok,
  label,
  warn,
}: {
  ok: boolean;
  label: string;
  warn?: boolean;
}) {
  const cls = ok
    ? "bg-[#25D366]/15 text-[#25D366] border-[#25D366]/20"
    : warn
      ? "bg-amber-500/15 text-amber-300 border-amber-500/20"
      : "bg-white/5 text-gray-400 border-white/10";
  return (
    <span
      className={`inline-flex items-center border rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

function bankLabel(status: string | null): { ok: boolean; warn: boolean; label: string } {
  if (!status) return { ok: false, warn: false, label: "Not linked" };
  const s = status.toUpperCase();
  if (["ACTIVE", "COMPLETED", "SUCCESS"].includes(s)) {
    return { ok: true, warn: false, label: "Setu linked" };
  }
  if (["PENDING", "INITIATED"].includes(s)) {
    return { ok: false, warn: true, label: status };
  }
  return { ok: false, warn: false, label: status };
}

export default function AdminClientsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ClientsOverview | null>(null);
  const [search, setSearch] = useState("");

  const fetchClients = async (key: string = adminKey) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/clients", {
        headers: { "x-admin-key": key },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load clients");
      setData(json);
      setAuthed(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

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

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {!authed ? (
        <div className="flex items-start justify-center pt-4 sm:pt-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-sm">
            <div className="w-12 h-12 bg-[#25D366]/15 rounded-xl flex items-center justify-center mb-5">
              <Shield className="w-5 h-5 text-[#25D366]" />
            </div>
            <h2 className="text-xl font-bold mb-1">Clients dashboard</h2>
            <p className="text-gray-500 text-sm mb-5">
              View onboarded businesses, team size, inventory, Zoho, and Setu
              bank status.
            </p>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchClients(adminKey)}
              placeholder="Admin key"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#25D366] transition-colors mb-4 text-sm"
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              onClick={() => fetchClients(adminKey)}
              disabled={loading}
              className="w-full bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Open dashboard"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold">Onboarded clients</h2>
              <p className="text-gray-500 text-sm">
                Factories registered via onboarding + WhatsApp
              </p>
            </div>
            <button
              onClick={() => fetchClients()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-sm font-medium transition-colors w-fit"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {[
                {
                  label: "Clients",
                  value: data.totals.factories,
                  icon: Building2,
                },
                {
                  label: "Team members",
                  value: data.totals.total_team_members,
                  icon: Users,
                },
                {
                  label: "Inventory SKUs",
                  value: data.totals.total_inventory_items,
                  icon: Package,
                },
                {
                  label: "Zoho connected",
                  value: data.totals.with_zoho,
                  icon: Link2,
                },
                {
                  label: "Bank linked",
                  value: data.totals.with_bank_consent,
                  icon: Landmark,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5"
                >
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <s.icon className="w-3.5 h-3.5" />
                    <p className="text-xs">{s.label}</p>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business, owner, phone..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-[#25D366]/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-center py-16 text-gray-500">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-16 text-gray-500">No clients found.</p>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-gray-400">
                      <th className="text-left px-5 py-4 font-semibold">
                        Business
                      </th>
                      <th className="text-left px-5 py-4 font-semibold">
                        Owner
                      </th>
                      <th className="text-left px-5 py-4 font-semibold">
                        Team
                      </th>
                      <th className="text-left px-5 py-4 font-semibold">
                        Inventory
                      </th>
                      <th className="text-left px-5 py-4 font-semibold">
                        Zoho
                      </th>
                      <th className="text-left px-5 py-4 font-semibold">
                        Setu bank
                      </th>
                      <th className="text-left px-5 py-4 font-semibold">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const bank = bankLabel(c.bank_consent_status);
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <p className="font-medium text-white">{c.name}</p>
                            {c.address && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {c.address}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-gray-200">
                              {c.owner_name || "—"}
                            </p>
                            {c.owner_phone && (
                              <a
                                href={`tel:${c.owner_phone}`}
                                className="text-[#25D366] text-xs font-mono hover:underline"
                              >
                                {c.owner_phone}
                              </a>
                            )}
                          </td>
                          <td className="px-5 py-4 text-gray-300">
                            {c.team_members}
                          </td>
                          <td className="px-5 py-4 text-gray-300">
                            {c.inventory_items}
                          </td>
                          <td className="px-5 py-4">
                            <StatusPill
                              ok={c.zoho_connected}
                              label={
                                c.zoho_connected ? "Connected" : "Not connected"
                              }
                            />
                          </td>
                          <td className="px-5 py-4">
                            <StatusPill
                              ok={bank.ok}
                              warn={bank.warn}
                              label={bank.label}
                            />
                          </td>
                          <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                            {fmt(c.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
