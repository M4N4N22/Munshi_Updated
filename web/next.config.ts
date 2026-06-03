import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Next 16.2: ensure .env.local is loaded before config (runtime route handlers).
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const whatsappDigits =
  process.env.WHATSAPP_BUSINESS_NUMBER?.replace(/\D/g, "") ||
  process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER?.replace(/\D/g, "") ||
  "";

const nextConfig: NextConfig = {
  env: {
    WHATSAPP_BUSINESS_NUMBER: whatsappDigits,
    NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER: whatsappDigits,
  },
};

export default nextConfig;
