/// <reference types="vitest/config" />

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
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
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
