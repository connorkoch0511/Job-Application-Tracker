import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode indicator badge so committed Playwright screenshots stay clean.
  devIndicators: false,
};

export default nextConfig;
