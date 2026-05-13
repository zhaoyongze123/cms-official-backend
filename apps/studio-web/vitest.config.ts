import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@cms/editor-protocol": resolve(__dirname, "../../packages/editor-protocol/src/index.ts"),
    },
  },
});
