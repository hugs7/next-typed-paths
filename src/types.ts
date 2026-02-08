/**
 * Type definitions for route builder
 */

// Utility type to convert kebab-case to camelCase
type CamelCase<S extends string> = S extends `${infer First}-${infer Rest}`
  ? `${Lowercase<First>}${Capitalize<CamelCase<Rest>>}`
  : Lowercase<S>;

// Helper to check if an object has non-metadata keys (children)
export type HasChildren<T> = keyof Omit<T, "$param" | "$route"> extends never ? false : true;

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

/**
 * Special keys used in route structure for metadata
 */
export type MetadataKey = "$param" | "$route";

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

/**
 * Configuration options for route generation
 */
export interface RouteConfig {
  /** Input directory to scan (e.g., "./app/api") */
  input: string;
  /** Output file path for generated routes */
  output: string;
  /** Watch for changes and regenerate */
  watch?: boolean;
  /** Base prefix for all routes (e.g., "/api") */
  basePrefix?: string;
  /**
   * Parameter type map configuration
   * Allows importing a type that defines parameter types
   * @example
   * { type: "MyParamTypes", from: "./types" }
   */
  paramTypeMap?: {
    /** The name of the type to import */
    type: string;
    /** The module path to import from */
    from: string;
  };
  /** Name for the generated routes constant (defaults to "routes") */
  routesName?: string;
  /** Additional imports to include in generated file */
  imports?: string[];
}
