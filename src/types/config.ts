export type ParamTypeMap = {
  /** The name of the type to import */
  type: string;
  /** The module path to import from */
  from: string;
};

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
  /**
   * Base prefix for all routes
   * Defaults to the input path relative to ./app.
   * For example, if input is "./app/api", the default basePrefix will be "/api".
   *
   * As a fallback, "/" is used if the input path cannot be parsed.
   */
  basePrefix?: string;
  /**
   * Parameter type map configuration
   * Allows importing a type that defines parameter types
   * @example
   * { type: "MyParamTypes", from: "./types" }
   */
  paramTypeMap?: ParamTypeMap;
  /** Name for the generated routes constant (defaults to "routes") */
  routesName?: string;
  /** Additional imports to include in generated file */
  imports?: string[];
}
