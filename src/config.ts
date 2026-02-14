/**
 * Configuration loader using cosmiconfig
 */

import { cosmiconfig } from "cosmiconfig";

import { CONFIG_MODULE_NAME, DEFAULT_INPUT_DIR, DEFAULT_OUTPUT_FILE } from "@/constants";
import { MaybeArray } from "@/runtime";
import { RouteConfig } from "@/types";
import { ensureArray } from "@/utils";

const explorer = cosmiconfig(CONFIG_MODULE_NAME);

/**
 * Default configuration
 */
export const defaultConfig = {
  input: DEFAULT_INPUT_DIR,
  output: DEFAULT_OUTPUT_FILE,
  watch: false,
  routesName: "routes",
} as const satisfies RouteConfig;

/**
 * Computes the default base prefix, relative to the input path.
 * For example, if the input is "./app/api", the default base prefix will be "/api".
 * If the input path cannot be parsed, it falls back to "/".
 *
 * @param config - The route configuration object
 * @returns The computed default base prefix
 */
const computeDefaultBasePrefix = (config: RouteConfig): string => {
  const inputParts = config.input.split("/").filter((part) => part && part !== ".");

  if (inputParts.some((part) => part === "app")) {
    const appIndex = inputParts.indexOf("app");
    const inputRelativeToApp = inputParts.slice(appIndex + 1).join("/");

    return `/${inputRelativeToApp}`;
  }

  // Fallback to "/" if we can't determine a relative path
  return "/";
};

/**
 * Load configuration from file or use defaults
 */
export const loadConfig = async (configPath?: string): Promise<RouteConfig[]> => {
  try {
    const result = configPath ? await explorer.load(configPath) : await explorer.search();

    if (result && result.config) {
      const castedConfig = result.config as MaybeArray<RouteConfig>;

      return ensureArray(castedConfig).map(({ basePrefix, ...config }) => ({
        ...defaultConfig,
        basePrefix: basePrefix ?? computeDefaultBasePrefix(config),
        ...config,
      }));
    }
  } catch (error) {
    // Config file not found or invalid, use defaults
    console.warn("No config file found, using defaults");
  }

  return [defaultConfig];
};

/**
 * Merge config with CLI options
 */
export const mergeConfig = (baseConfig: RouteConfig, options: Partial<RouteConfig>): RouteConfig => {
  return {
    ...baseConfig,
    ...Object.fromEntries(Object.entries(options).filter(([_, v]) => v !== undefined)),
  };
};
