import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const cmsImageRemotePatterns: RemotePattern[] = [
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "9801",
    pathname: "/media/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "9801",
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
  outputFileTracingRoot: path.resolve(currentDirectory, "../.."),
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
