import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every app page reads the session cookie, so we use classic dynamic rendering
  // rather than Cache Components' static-shell model.
  cacheComponents: false,
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
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
