import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import path from "node:path";

const cmsImageRemotePatterns: RemotePattern[] = [
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "8001",
    pathname: "/media/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "8001",
    pathname: "/media/**",
  },
  {
    protocol: "https",
    hostname: "www.yuncan.com",
    pathname: "/media/**",
  },
  {
    protocol: "https",
    hostname: "www.yuncan.com",
    pathname: "/django/media/**",
  },
  {
    protocol: "https",
    hostname: "yuncan.com",
    pathname: "/media/**",
  },
  {
    protocol: "https",
    hostname: "yuncan.com",
    pathname: "/django/media/**",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      ...cmsImageRemotePatterns,
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
