import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const basePath = "/django-admin/next-editor";
const defaultDevOrigin = "http://127.0.0.1:3000";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig | ((phase: string) => import('next').NextConfig)} */
const nextConfig = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;
  const normalizedDevOrigin =
    process.env.NEXT_EDITOR_DEV_ORIGIN?.replace(/\/$/, "") ?? defaultDevOrigin;

  return {
    basePath,
    output: "standalone",
    assetPrefix: isDevelopmentServer ? `${normalizedDevOrigin}${basePath}` : undefined,
    allowedDevOrigins: ["127.0.0.1", "localhost"],
    typedRoutes: true,
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    experimental: {
      externalDir: true
    }
  };
};

export default nextConfig;
