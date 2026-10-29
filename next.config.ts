import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` is required by the Neon serverless Pool for interactive transactions.
  serverExternalPackages: ["ws"],
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
