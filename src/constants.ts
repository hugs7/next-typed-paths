/**
 * Constants used throughout the package
 */

import { Options as PrettierOptions } from "prettier";

export const PACKAGE_NAME = "next-typed-paths";
export const RUNTIME_SUBMODULE = "runtime";
export const PACKAGE_VERSION = __PACKAGE_VERSION__;
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
