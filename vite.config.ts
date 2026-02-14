/// <reference types="vitest/config" />

import { chmodSync } from "fs";
import { join, resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

const isCI = process.env.CI === String(true);
console.log(`Building in ${isCI ? "CI" : "local"} mode...`);

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      tsconfigPath: join(__dirname, "tsconfig.lib.json"),
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    }),
    {
      name: "make-cli-executable",
      closeBundle() {
        if (isCI) {
          return;
        }

        const cliFiles = [resolve(__dirname, "dist/cli.js"), resolve(__dirname, "dist/cli.cjs")];
        cliFiles.forEach((file) => {
          try {
            chmodSync(file, 0o755);
            console.log(`✓ Made ${file.split("/").pop()} executable`);
          } catch (err) {
            console.warn(`Could not make ${file} executable:`, err);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "next-typed-paths/runtime": resolve(__dirname, "src/runtime/index.ts"),
      "next-typed-paths": resolve(__dirname, "src/index.ts"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli.ts"),
        "runtime/index": resolve(__dirname, "src/runtime/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    minify: isCI,
    rollupOptions: {
      external: [
        "chokidar",
        "commander",
        "cosmiconfig",
        "fs",
        "fs/promises",
        "lodash-es",
        "path",
        "prettier",
        "ts-morph",
        "url",
        "zod",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    globals: true,
  },
});
