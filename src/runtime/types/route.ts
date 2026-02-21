/**
 * Type definitions for route builder
 */

import { CamelCase, StripParentheses } from "./util";

/**
 * Special keys used in route structure for metadata
 */
export type MetadataKey = keyof RouteMetadata;

type OmitParamMetaKey<T> = Omit<T, Extract<MetadataKey, "$$param">>;

// Helper to check if an object has non-metadata keys (children)
export type HasChildren<T> = keyof Omit<T, MetadataKey> extends never ? false : true;

// Get the type for a specific parameter from the type map
export type GetParamType<P extends string, TMap = {}> = P extends keyof TMap ? TMap[P] : string;

// Type-safe route builder types
export type RouteBuilder<T, TMap = {}> = T extends { $$param: infer P extends string }
  ? HasChildren<T> extends true
    ? (
        param: GetParamType<P, TMap>,
      ) => RouteBuilderObject<OmitParamMetaKey<T>, TMap> & (T extends { $$route: true } ? { $: () => string } : {})
    : T extends { $$route: true }
      ? (param: GetParamType<P, TMap>) => string
      : (param: GetParamType<P, TMap>) => RouteBuilderObject<OmitParamMetaKey<T>, TMap>
  : T extends { $$route: true }
    ? HasChildren<T> extends true
      ? RouteBuilderObject<T, TMap> & { $: () => string }
      : () => string
    : T extends object
      ? RouteBuilderObject<T, TMap>
      : never;

export type RouteBuilderObject<T, TMap = {}> = {
  [K in keyof T as K extends MetadataKey ? never : CamelCase<StripParentheses<K & string>>]: RouteBuilder<T[K], TMap>;
};

// Meta keys are double-dollar prefixed to avoid collisions with
// potential route slugs with the same name.
type RouteMetadata = {
  /** Parameter name for dynamic segments */
  $$param?: string;
  /** Whether this node has a route file */
  $$route?: boolean;
};

/**
 * Route structure node
 */
export type RouteNode = RouteMetadata & {
  [key: string]: any;
};
