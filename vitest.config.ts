import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The `@/*` alias lives in tsconfig.json for `bb plugin build`; Vite needs its
// own copy to resolve the vendored components from app.tsx.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["*.test.tsx", "*.test.ts", "**/*.test.tsx", "**/*.test.ts"],
  },
});
