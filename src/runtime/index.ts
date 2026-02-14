/**
 * Browser-safe runtime module
 *
 * This module contains only client-side safe code with no Node.js dependencies.
 * Import from 'next-typed-paths/runtime' to use in browser environments.
 */

export { buildRoutePath, createRouteBuilder } from "./runtime";
export * from "./types";
