import { hashOtpCode, verifyOtpCode } from './onboarding-otp.crypto';

describe('onboarding-otp.crypto', () => {
  const prev = process.env.OTP_PEPPER;

  beforeEach(() => {
    process.env.OTP_PEPPER = 'test-pepper';
  });

  afterAll(() => {
    process.env.OTP_PEPPER = prev;
  });

  it('hashes and verifies OTP codes', () => {
    const hash = hashOtpCode('123456');
    expect(verifyOtpCode('123456', hash)).toBe(true);
    expect(verifyOtpCode('000000', hash)).toBe(false);
  });
});
