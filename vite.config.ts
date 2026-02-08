/// <reference types="vitest/config" />

import { join, resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

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
      "next-typed-paths": resolve(__dirname, "src/index.ts"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
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
