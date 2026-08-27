import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, too small for a payment screenshot upload.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
