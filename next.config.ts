import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode "N" badge so it doesn't overlap the composer in demo recordings.
  devIndicators: false,
};

export default nextConfig;
