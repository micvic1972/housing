import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "://unsplash.com" },
    ],
  },
  //  Move this out of experimental and place it at the root level:
   allowedDevOrigins: ["192.168.18.7", "192.168.18.10", "localhost:3000"]
};

export default nextConfig;
