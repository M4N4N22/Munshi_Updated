/** Public env — safe for browser. Secrets stay on the API (EC2). */

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4001";

export const bookDemoUrl =
  process.env.NEXT_PUBLIC_BOOK_DEMO_URL || "https://cal.com";

export const youtubeUrl =
  process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://www.youtube.com";
