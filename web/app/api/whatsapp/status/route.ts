import { NextResponse } from "next/server";
import { isWhatsappConfigured } from "@/lib/whatsapp-server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ configured: isWhatsappConfigured() });
}
