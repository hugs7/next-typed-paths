/**
 * Constants used throughout the package
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { Options as PrettierOptions } from "prettier";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));
const packageVersion = packageJson.version;

export const PACKAGE_NAME = "next-typed-paths";
export const RUNTIME_SUBMODULE = "runtime";
export const PACKAGE_VERSION = packageVersion;
export const CLI_NAME = PACKAGE_NAME;
export const CONFIG_MODULE_NAME = "routes";
export const CONFIG_FILE_NAME = "routes.config";

export const DEFAULT_INPUT_DIR = "./app/api";
export const DEFAULT_OUTPUT_FILE = "./generated/routes.ts";
export const DEFAULT_BASE_PREFIX = "/api";

export const WATCH_DEBOUNCE_MS = 300;
export const ROUTE_FILE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
export const ROUTE_FILE_NAME = "route";
export const PAGE_FILE_NAME = "page";

export const PRETTIER_DEFAULT_CONFIG: PrettierOptions = {
  parser: "typescript",
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  printWidth: 100,
  tabWidth: 2,
};
