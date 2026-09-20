import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "://unsplash.com" },
    ],
  },
  //  Move this out of experimental and place it at the root level:
  allowedDevOrigins: ["10.62.0.69", "localhost:3000"]
};

export default nextConfig;
