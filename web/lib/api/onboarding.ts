import { apiGet, apiPost } from "@/lib/api/client";

export type OnboardingConfig = {
  otp_required: boolean;
};

export type SendOtpResponse = {
  phone_number: string;
  expires_in_seconds: number;
  dev_otp?: string;
};

export type VerifyOtpResponse = {
  phone_number: string;
  verified: boolean;
};

export type RegisterOnboardingResponse = {
  phone_number: string;
  user_id: number;
  factory_id: number;
  already_registered: boolean;
};

export function fetchOnboardingConfig() {
  return apiGet<OnboardingConfig>("/onboarding/config");
}

export function sendOtp(phone_number: string) {
  return apiPost<SendOtpResponse>("/onboarding/otp/send", { phone_number });
}

export function verifyOtp(phone_number: string, code: string) {
  return apiPost<VerifyOtpResponse>("/onboarding/otp/verify", {
    phone_number,
    code,
  });
}

export function registerOnboarding(payload: {
  phone_number: string;
  name: string;
  factory_name: string;
}) {
  return apiPost<RegisterOnboardingResponse>("/onboarding/register", payload);
}
