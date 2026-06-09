"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Leads" },
  { href: "/admin/clients", label: "Clients" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const light = pathname.startsWith("/admin/clients");

  return (
    <div
      className={
        light
          ? "flex min-h-screen flex-col bg-zinc-50"
          : "min-h-screen bg-[#0f1a14] text-white"
      }
    >
      <header
        className={
          light
            ? "border-b border-zinc-200/80 bg-white/80 backdrop-blur"
            : "border-b border-white/10 px-4 sm:px-8 py-4"
        }
      >
        <div
          className={
            light
              ? "mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4"
              : "max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          }
        >
          <div className={light ? "flex items-center gap-6" : undefined}>
            <div>
              <h1
                className={
                  light
                    ? "text-sm font-semibold text-zinc-900"
                    : "text-base sm:text-lg font-bold"
                }
              >
                Munshi Ops
              </h1>
              {!light && (
                <p className="text-gray-500 text-xs">Internal admin</p>
              )}
            </div>
            <nav className={light ? "flex gap-1" : "flex gap-2"}>
              {NAV.map(({ href, label }) => {
                const active =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={
                      light
                        ? `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            active
                              ? "bg-zinc-900 text-white"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          }`
                        : `px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            active
                              ? "bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366]"
                              : "bg-white/5 border border-white/10 hover:bg-white/10"
                          }`
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {light && (
            <p className="hidden text-xs text-zinc-400 sm:block">Internal admin</p>
          )}
        </div>
      </header>
      {light ? (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>
      ) : (
        children
      )}
    </div>
  );
}
