import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const basePath = "/django-admin/next-editor";
const defaultDevOrigin = "http://127.0.0.1:3000";

/** @type {import('next').NextConfig | ((phase: string) => import('next').NextConfig)} */
const nextConfig = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;
  const normalizedDevOrigin =
    process.env.NEXT_EDITOR_DEV_ORIGIN?.replace(/\/$/, "") ?? defaultDevOrigin;

  return {
    basePath,
    assetPrefix: isDevelopmentServer ? `${normalizedDevOrigin}${basePath}` : undefined,
    allowedDevOrigins: ["127.0.0.1", "localhost"],
    experimental: {
      typedRoutes: true,
      externalDir: true
    }
  };
};

export default nextConfig;
