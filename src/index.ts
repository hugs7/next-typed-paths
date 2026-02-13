/**
 * Main entry point for the package
 */

export { defaultConfig, loadConfig, mergeConfig } from "./config";
export * from "./constants";
export { generateRouteFile } from "./generator";
export { buildRoutePath, createRouteBuilder } from "./runtime";
export { generateRouteStructure, scanDirectory } from "./scanner";
export type {
  GetParamType,
  HasChildren,
  ParamTypeMap,
  RouteBuilder,
  RouteBuilderObject,
  RouteConfig,
  RouteNode,
} from "./types";
export { startWatcher } from "./watcher";
export type { RegenerateCallback } from "./watcher";
