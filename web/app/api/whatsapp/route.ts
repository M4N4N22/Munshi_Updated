import { NextRequest, NextResponse } from "next/server";
import { getWhatsappBusinessNumber } from "@/lib/whatsapp-server";

/**
 * Server-only redirect to WhatsApp — business number stays off the client bundle.
 * Set WHATSAPP_BUSINESS_NUMBER (digits, e.g. 919876543210) in munshi-web/.env.local
 */
export function GET(request: NextRequest) {
  const raw = getWhatsappBusinessNumber();
  if (!raw) {
    const back = new URL("/onboarding", request.url);
    back.searchParams.set("whatsapp", "missing");
    return NextResponse.redirect(back);
  }

  const text = request.nextUrl.searchParams.get("text") || "START";
  const url = `https://wa.me/${raw}?text=${encodeURIComponent(text)}`;
  return NextResponse.redirect(url);
}