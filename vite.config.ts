/// <reference types="vitest/config" />

import { chmodSync, readFileSync } from "fs";
import { resolve } from "path";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

const fromRoot = (...paths: string[]) => resolve(import.meta.dirname, ...paths);

// Single source of truth for the package's public modules. Entry names without
// "index" (only cli) are internal and get no export alias.
const entrySources = {
  index: "src/index.ts",
  cli: "src/cli.ts",
  "axios/index": "src/axios/index.ts",
  "client/index": "src/client/index.ts",
  "contracts/index": "src/contracts/index.ts",
  "next/index": "src/next/index.ts",
  "runtime/index": "src/runtime/index.ts",
};

const entries = Object.fromEntries(Object.entries(entrySources).map(([name, src]) => [name, fromRoot(src)]));

const aliases = Object.fromEntries(
  Object.entries(entries)
    .filter(([name]) => name !== "cli")
    // Longest keys first: "next-typed-paths/runtime" must match before the
    // bare "next-typed-paths" alias, which is a prefix of it.
    .sort(([a], [b]) => b.length - a.length)
    .map(([name, path]) => [
      ["next-typed-paths", name !== "index" && name.replace(/\/index$/, "")].filter(Boolean).join("/"),
      path,
    ]),
);

const isCI = process.env.CI === String(true);
console.log(`Building in ${isCI ? "CI" : "local"} mode...`);

const pkg = JSON.parse(readFileSync(fromRoot("package.json"), "utf-8")) as { version: string };

export default defineConfig({
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    dts({
      tsconfigPath: fromRoot("tsconfig.lib.json"),
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    }),
    {
      name: "make-cli-executable",
      closeBundle() {
        if (isCI) {
          return;
        }

        const cliFiles = [fromRoot("dist/cli.js"), fromRoot("dist/cli.cjs")];
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
    alias: aliases,
    tsconfigPaths: true,
  },
  build: {
    lib: {
      entry: entries,
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    minify: isCI,
    rollupOptions: {
      external: [
        "axios",
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
