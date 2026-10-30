import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` is required by the Neon serverless Pool for interactive transactions;
  // `pdfkit` reads its font files from disk, so it must not be bundled.
  serverExternalPackages: ["ws", "pdfkit", "exceljs"],
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
