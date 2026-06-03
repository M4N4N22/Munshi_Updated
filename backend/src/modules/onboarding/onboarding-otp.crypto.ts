import { createHash, timingSafeEqual } from 'crypto';

function otpPepper(): string {
  return (
    process.env.OTP_PEPPER?.trim() ||
    process.env.X_SECRET?.trim() ||
    'munshi-otp-dev-pepper'
  );
}

export function hashOtpCode(code: string): string {
  return createHash('sha256')
    .update(`${otpPepper()}:${code}`)
    .digest('hex');
}

export function verifyOtpCode(code: string, codeHash: string): boolean {
  const computed = hashOtpCode(code);
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(codeHash));
  } catch {
    return false;
  }
}
