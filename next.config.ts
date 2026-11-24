import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` is required by the Neon serverless Pool for interactive transactions;
  // `pdfkit` reads its font files from disk, so it must not be bundled.
  serverExternalPackages: ["ws", "pdfkit", "exceljs"],
  // The customer menu lists public/menu-photos at request time to match photos to items. On Vercel the
  // public folder is not part of a function's files unless traced in, so include it for that page.
  outputFileTracingIncludes: {
    "/c/menu": ["./public/menu-photos/**/*"],
  },
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
