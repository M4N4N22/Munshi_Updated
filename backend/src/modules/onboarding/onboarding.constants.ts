/** When true, web register skips SMS OTP (pilot only — set false when MSG91 is live). */
export function isOnboardingSkipOtpEnabled(): boolean {
  return process.env.ONBOARDING_SKIP_OTP?.trim().toLowerCase() === 'true';
}
