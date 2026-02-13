/**
 * Type definitions for route builder
 */

import { CamelCase } from "./util";

/**
 * Special keys used in route structure for metadata
 */
export type MetadataKey = "$param" | "$route";

// Helper to check if an object has non-metadata keys (children)
export type HasChildren<T> = keyof Omit<T, MetadataKey> extends never ? false : true;

// Get the type for a specific parameter from the type map
export type GetParamType<P extends string, TMap = {}> = P extends keyof TMap ? TMap[P] : string;

// Type-safe route builder types
export type RouteBuilder<T, TMap = {}> = T extends { $param: infer P extends string }
  ? HasChildren<T> extends true
    ? (
        param: GetParamType<P, TMap>,
      ) => RouteBuilderObject<Omit<T, "$param">, TMap> & (T extends { $route: true } ? { $: () => string } : {})
    : T extends { $route: true }
      ? (param: GetParamType<P, TMap>) => string
      : (param: GetParamType<P, TMap>) => RouteBuilderObject<Omit<T, "$param">, TMap>
  : T extends { $route: true }
    ? HasChildren<T> extends true
      ? RouteBuilderObject<T, TMap> & { $: () => string }
      : () => string
    : T extends object
      ? RouteBuilderObject<T, TMap>
      : never;

export type RouteBuilderObject<T, TMap = {}> = {
  [K in keyof T as K extends MetadataKey ? never : CamelCase<K & string>]: RouteBuilder<T[K], TMap>;
};

/**
 * Route structure node
 */
export interface RouteNode {
  /** Parameter name for dynamic segments */
  $param?: string;
  /** Whether this node has a route file */
  $route?: boolean;
  [key: string]: any;
}
