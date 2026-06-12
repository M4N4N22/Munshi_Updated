export const ONBOARDING_SETUP_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
} as const;

export type OnboardingSetupStepStatus =
  (typeof ONBOARDING_SETUP_STATUS)[keyof typeof ONBOARDING_SETUP_STATUS];

export const ONBOARDING_SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingWelcome = {
  phone: string;
  name: string;
};
