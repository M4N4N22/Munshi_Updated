import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f1a14] text-white">
      <div className="border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold">Munshi Ops</h1>
            <p className="text-gray-500 text-xs">Internal admin</p>
          </div>
          <nav className="flex gap-2">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              Leads
            </Link>
            <Link
              href="/admin/clients"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              Clients
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
