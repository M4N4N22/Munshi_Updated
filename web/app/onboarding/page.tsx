import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { isWhatsappConfigured } from "@/lib/whatsapp-server";

/** Read WHATSAPP_BUSINESS_NUMBER from .env.local at request time (not at build). */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get started — Munshi",
  description:
    "Register your mobile and start managing employees on WhatsApp with Munshi.",
};

type OnboardingPageProps = {
  searchParams?: Promise<{ whatsapp?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = searchParams ? await searchParams : {};
  const whatsappConfigured = isWhatsappConfigured();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <span className="text-sm font-semibold text-zinc-900">Munshi</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12">
        <OnboardingForm
          whatsappConfigured={whatsappConfigured}
          whatsappConfigMissing={params.whatsapp === "missing"}
        />
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        API: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001"} ·
        Questions? Use Book a demo above.
      </footer>
    </div>
  );
}
