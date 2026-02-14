/**
 * Main entry point for the package
 */

export { defaultConfig, loadConfig, mergeConfig } from "@/config";
export { CLI_NAME, CONFIG_FILE_NAME, CONFIG_MODULE_NAME, PACKAGE_NAME, PACKAGE_VERSION } from "@/constants";
export { generateRouteFile } from "@/generator";
export type { GetParamType, HasChildren, RouteBuilder, RouteBuilderObject, RouteNode } from "@/runtime/types";
export { generateRouteStructure, scanDirectory } from "@/scanner";
export type { ParamTypeMap, RouteConfig } from "@/types";
export { startWatcher } from "@/watcher";
export type { RegenerateCallback } from "@/watcher";
