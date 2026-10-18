import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "://unsplash.com" },
    ],
  },
  //  Move this out of experimental and place it at the root level:
   allowedDevOrigins: ["192.168.18.3", "192.168.18.2", "localhost:3001"]
};

export default nextConfig;
