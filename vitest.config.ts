import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "e2e"],
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/__tests__/**",
        "src/types/**",
      ],
      // Regression guards on the business-critical layers (set just below
      // current coverage). UI components are intentionally not gated.
      thresholds: {
        "src/actions/**": {
          statements: 85,
          branches: 70,
          functions: 85,
          lines: 85,
        },
        "src/lib/validations/**": {
          statements: 95,
          branches: 90,
          functions: 85,
          lines: 95,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/navigation": path.resolve(
        __dirname,
        "./node_modules/next/navigation.js"
      ),
    },
  },
});
