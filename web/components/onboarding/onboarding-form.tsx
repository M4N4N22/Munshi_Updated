"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  registerOnboarding,
  sendOtp,
  verifyOtp,
} from "@/lib/api/onboarding";
import { bookDemoUrl, youtubeUrl } from "@/lib/config";
import { formatPhoneDisplay, normalizeIndianPhone } from "@/lib/phone";

type Step = "phone" | "otp" | "ready";

const WHATSAPP_HREF = "/api/whatsapp?text=START";

type OnboardingFormProps = {
  whatsappConfigured?: boolean;
  whatsappConfigMissing?: boolean;
};

export function OnboardingForm({
  whatsappConfigured = false,
  whatsappConfigMissing = false,
}: OnboardingFormProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [normalized, setNormalized] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const publicWa = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER?.replace(
    /\D/g,
    "",
  );
  const [whatsappReady, setWhatsappReady] = useState(
    whatsappConfigured || !!publicWa,
  );

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

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      setError("Enter a valid 10-digit Indian mobile number.");
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

    setSubmitting(true);
    try {
      await verifyOtp(normalized, code);
      await registerOnboarding({
        phone_number: normalized,
        name: name.trim() || undefined,
        factory_name: factoryName.trim() || undefined,
      });
      setStep("ready");
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
    setStep("phone");
    setNormalized(null);
    setOtp("");
    setPhone("");
    setName("");
    setFactoryName("");
    setError(null);
    setDevOtpHint(null);
    setResendCooldown(0);
  }

  if (step === "ready" && normalized) {
    return (
      <div className="flex w-full max-w-md flex-col gap-6">
        {whatsappConfigMissing && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            WhatsApp link is not configured yet. Add{" "}
            <code className="font-mono text-xs">WHATSAPP_BUSINESS_NUMBER</code>{" "}
            to <code className="font-mono text-xs">munshi-web/.env.local</code>{" "}
            and restart <code className="font-mono text-xs">npm run dev</code>.
          </p>
        )}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Verified
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Continue on WhatsApp
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">
            <span className="font-medium">{formatPhoneDisplay(normalized)}</span>{" "}
            is verified. Open Munshi on WhatsApp and send{" "}
            <span className="font-mono font-medium">START</span> to set up
            employees, attendance, and tasks.
          </p>
        </div>

        {whatsappReady ? (
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center rounded-xl bg-[#25D366] px-6 text-base font-semibold text-white shadow-sm transition hover:bg-[#1da851]"
          >
            Open WhatsApp
          </a>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              WhatsApp link not detected. Confirm{" "}
              <code className="font-mono text-xs">WHATSAPP_BUSINESS_NUMBER</code>{" "}
              in <code className="font-mono text-xs">.env.local</code>, restart{" "}
              <code className="font-mono text-xs">npm run dev</code>, then refresh
              this page.
            </p>
            <a
              href={WHATSAPP_HREF}
              className="text-center text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Try Open WhatsApp anyway
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={resetAll}
          className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          Use a different number
        </button>
      </div>
    );
  }

  if (step === "otp" && normalized) {
    return (
      <div className="flex w-full max-w-md flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-emerald-700">Step 2 of 2</p>
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
            {submitting ? "Setting up account…" : "Verify & continue"}
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

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Munshi
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
          Run your factory on WhatsApp
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600">
          Register your mobile. We&apos;ll verify it by SMS, then connect you to
          Munshi on WhatsApp for employee management, attendance, and tasks.
        </p>
      </div>

      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
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
          <span className="text-sm font-medium text-zinc-800">
            Your name <span className="font-normal text-zinc-500">(optional)</span>
          </span>
          <input
            type="text"
            autoComplete="name"
            placeholder="Anmol Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-12 rounded-xl border border-zinc-300 px-3 text-base text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-800">
            Factory / company name{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </span>
          <input
            type="text"
            placeholder="ABC Textiles"
            value={factoryName}
            onChange={(e) => setFactoryName(e.target.value)}
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
          disabled={submitting}
          className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Sending code…" : "Send verification code"}
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
