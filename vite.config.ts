/// <reference types="vitest/config" />

import { chmodSync, readFileSync } from "fs";
import { resolve } from "path";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

const fromRoot = (...paths: string[]) => resolve(import.meta.dirname, ...paths);

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
    alias: {
      "next-typed-paths/axios": fromRoot("src/axios/index.ts"),
      "next-typed-paths/client": fromRoot("src/client/index.ts"),
      "next-typed-paths/contracts": fromRoot("src/contracts/index.ts"),
      "next-typed-paths/next": fromRoot("src/next/index.ts"),
      "next-typed-paths/runtime": fromRoot("src/runtime/index.ts"),
      "next-typed-paths": fromRoot("src/index.ts"),
    },
    tsconfigPaths: true,
  },
  build: {
    lib: {
      entry: {
        index: fromRoot("src/index.ts"),
        cli: fromRoot("src/cli.ts"),
        "axios/index": fromRoot("src/axios/index.ts"),
        "client/index": fromRoot("src/client/index.ts"),
        "contracts/index": fromRoot("src/contracts/index.ts"),
        "next/index": fromRoot("src/next/index.ts"),
        "runtime/index": fromRoot("src/runtime/index.ts"),
      },
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
