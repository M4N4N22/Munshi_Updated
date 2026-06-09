export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/config";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiSecret = process.env.X_SECRET?.trim();
  if (!apiSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: X_SECRET missing for admin proxy." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/clients`, {
      headers: { "x-secret": apiSecret },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || "Backend request failed" },
        { status: res.status },
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/clients error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
