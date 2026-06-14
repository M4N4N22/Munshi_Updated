"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  fetchOnboardingConfig,
  registerOnboarding,
  sendOtp,
  verifyOtp,
} from "@/lib/api/onboarding";
import { bookDemoUrl, youtubeUrl } from "@/lib/config";
import { formatPhoneDisplay, normalizeIndianPhone } from "@/lib/phone";
import {
  OnboardingInventoryStep,
  OnboardingReadyStep,
  OnboardingTeamStep,
  loadOnboardingSetupSession,
  saveOnboardingSetupSession,
  clearOnboardingSetupSession,
} from "@/components/onboarding/onboarding-setup-steps";
import { LoadingState } from "@/components/ui/loading-state";
import { Spinner } from "@/components/ui/spinner";

type Step = "phone" | "otp" | "inventory" | "team" | "ready";

type OnboardingFormProps = {
  whatsappConfigured?: boolean;
  whatsappConfigMissing?: boolean;
  zohoReturn?: boolean;
};

export function OnboardingForm({
  whatsappConfigured = false,
  whatsappConfigMissing = false,
  zohoReturn = false,
}: OnboardingFormProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [normalized, setNormalized] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpRequired, setOtpRequired] = useState<boolean | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [factoryId, setFactoryId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const publicWa = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER?.replace(
    /\D/g,
    "",
  );
  const [whatsappReady, setWhatsappReady] = useState(
    whatsappConfigured || !!publicWa,
  );

  useEffect(() => {
    fetchOnboardingConfig()
      .then((cfg) => setOtpRequired(cfg.otp_required))
      .catch(() => setOtpRequired(true));
  }, []);

  useEffect(() => {
    const saved = loadOnboardingSetupSession();
    if (!saved?.setupToken) return;
    setSetupToken(saved.setupToken);
    setFactoryId(saved.factoryId);
    setUserId(saved.userId);
    setNormalized(saved.phone);
    setCompanyName(saved.companyName);
    setStep(saved.step);
  }, []);

  useEffect(() => {
    setWhatsappReady(whatsappConfigured || !!publicWa);
  }, [whatsappConfigured, publicWa]);

  useEffect(() => {
    if (step !== "ready") return;
    let cancelled = false;
    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((body: { configured?: boolean }) => {
        if (!cancelled && body.configured) setWhatsappReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const requestOtp = useCallback(async (phoneE164: string) => {
    setError(null);
    setDevOtpHint(null);
    setSubmitting(true);
    try {
      const res = await sendOtp(phoneE164);
      if (res?.dev_otp) {
        setDevOtpHint(res.dev_otp);
      }
      setResendCooldown(60);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.retryAfterSec) setResendCooldown(err.retryAfterSec);
      } else {
        setError(
          err instanceof Error ? err.message : "Could not send OTP.",
        );
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  function validateProfileFields(): boolean {
    if (!name.trim()) {
      setError("Enter your name as the business owner.");
      return false;
    }
    if (!companyName.trim()) {
      setError("Enter your company name.");
      return false;
    }
    return true;
  }

  function beginSetupWizard(
    phoneE164: string,
    reg: {
      setup_token: string;
      factory_id: number;
      user_id: number;
    },
  ) {
    setNormalized(phoneE164);
    setSetupToken(reg.setup_token);
    setFactoryId(reg.factory_id);
    setUserId(reg.user_id);
    setStep("inventory");
    saveOnboardingSetupSession({
      setupToken: reg.setup_token,
      factoryId: reg.factory_id,
      userId: reg.user_id,
      phone: phoneE164,
      companyName: companyName.trim(),
      step: "inventory",
    });
  }

  async function registerAndContinue(phoneE164: string) {
    setSubmitting(true);
    setError(null);
    try {
      const reg = await registerOnboarding({
        phone_number: phoneE164,
        name: name.trim(),
        factory_name: companyName.trim(),
      });
      beginSetupWizard(phoneE164, reg);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not complete signup.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!validateProfileFields()) return;

    if (otpRequired === false) {
      await registerAndContinue(normalizedPhone);
      return;
    }

    const ok = await requestOtp(normalizedPhone);
    if (ok) {
      setNormalized(normalizedPhone);
      setStep("otp");
      setOtp("");
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!normalized) return;
    setError(null);

    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from SMS.");
      return;
    }

    if (!validateProfileFields()) return;

    setSubmitting(true);
    try {
      await verifyOtp(normalized, code);
      const reg = await registerOnboarding({
        phone_number: normalized,
        name: name.trim(),
        factory_name: companyName.trim(),
      });
      beginSetupWizard(normalized, reg);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Verification failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!normalized || resendCooldown > 0) return;
    await requestOtp(normalized);
  }

  function resetAll() {
    clearOnboardingSetupSession();
    setStep("phone");
    setNormalized(null);
    setSetupToken(null);
    setFactoryId(null);
    setUserId(null);
    setOtp("");
    setPhone("");
    setName("");
    setCompanyName("");
    setError(null);
    setDevOtpHint(null);
    setResendCooldown(0);
  }

  function goToTeam() {
    setStep("team");
    if (setupToken && factoryId && userId && normalized) {
      saveOnboardingSetupSession({
        setupToken,
        factoryId,
        userId,
        phone: normalized,
        companyName: companyName.trim(),
        step: "team",
      });
    }
  }

  function goToReady() {
    setStep("ready");
    if (setupToken && factoryId && userId && normalized) {
      saveOnboardingSetupSession({
        setupToken,
        factoryId,
        userId,
        phone: normalized,
        companyName: companyName.trim(),
        step: "ready",
      });
    }
  }

  const setupCtx =
    setupToken && factoryId && userId && normalized
      ? {
          setupToken,
          factoryId,
          userId,
          phone: normalized,
          companyName: companyName.trim(),
        }
      : null;

  if (otpRequired === null) {
    return (
      <LoadingState className="max-w-md py-16" minHeight="min-h-[12rem]" />
    );
  }

  if (step === "inventory" && setupCtx) {
    return (
      <OnboardingInventoryStep
        ctx={setupCtx}
        onBack={resetAll}
        onContinue={goToTeam}
        zohoReturn={zohoReturn}
      />
    );
  }

  if (step === "team" && setupCtx) {
    return (
      <OnboardingTeamStep
        ctx={setupCtx}
        onBack={() => setStep("inventory")}
        onContinue={goToReady}
      />
    );
  }

  if (step === "ready" && setupCtx) {
    return (
      <OnboardingReadyStep
        ctx={setupCtx}
        whatsappReady={whatsappReady}
        whatsappConfigMissing={whatsappConfigMissing}
        onReset={resetAll}
      />
    );
  }

  if (step === "otp" && normalized) {
    return (
      <div className="flex w-full max-w-md flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-emerald-700">Step 1 of 4</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-900">
            Enter verification code
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-zinc-800">
              {formatPhoneDisplay(normalized)}
            </span>
            .
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Registering{" "}
            <span className="font-medium text-zinc-700">{name.trim()}</span> for{" "}
            <span className="font-medium text-zinc-700">
              {companyName.trim()}
            </span>
            .
          </p>
        </div>

        {devOtpHint && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Dev mode: your code is{" "}
            <span className="font-mono font-bold">{devOtpHint}</span> (also in
            API logs when SMS is not configured).
          </p>
        )}

        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-800">OTP</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="min-h-12 rounded-xl border border-zinc-300 px-3 text-center font-mono text-2xl tracking-[0.35em] text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              maxLength={6}
            />
          </label>

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || otp.length !== 6}
            className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="border-white/20 border-t-white" />
                Setting up account…
              </span>
            ) : (
              "Verify & continue"
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError(null);
            }}
            className="font-medium text-zinc-600 hover:text-zinc-900"
          >
            Change number
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || submitting}
            className="font-medium text-emerald-700 hover:text-emerald-900 disabled:text-zinc-400"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  const skipOtp = otpRequired === false;

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div>
        {!skipOtp && (
          <p className="text-sm font-medium text-emerald-700">Step 1 of 4</p>
        )}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
          Run your business on WhatsApp
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600">
          {skipOtp
            ? "Add your details, import inventory and team (optional), then open Munshi on WhatsApp."
            : "Add your details and mobile number. We'll verify by SMS, then help you import data before WhatsApp."}
        </p>
      </div>

      <form onSubmit={handleContinue} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-800">
            Mobile number
          </span>
          <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-600">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-12 flex-1 px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
              maxLength={14}
            />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-800">Owner name</span>
          <input
            type="text"
            autoComplete="name"
            placeholder="Anmol Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="min-h-12 rounded-xl border border-zinc-300 px-3 text-base text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-800">Company name</span>
          <input
            type="text"
            autoComplete="organization"
            placeholder="ABC Textiles"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
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
          disabled={
            submitting ||
            !phone.trim() ||
            !name.trim() ||
            !companyName.trim()
          }
          className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" className="border-white/20 border-t-white" />
              Setting up…
            </span>
          ) : skipOtp ? (
            "Continue"
          ) : (
            "Send verification code"
          )}
        </button>
      </form>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Or explore first
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={bookDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
          >
            Book a demo
          </a>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
          >
            Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}
