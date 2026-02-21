/**
 * Core route builder runtime
 */

import { camelCase } from "lodash-es";

import type { MetadataKey, RouteBuilderObject } from "./types";

/**
 * Check if a segment is a Next.js route group (e.g., (group))
 *
 * @param segment - The segment to check
 * @returns True if the segment is a group segment, false otherwise
 * @see https://nextjs.org/docs/app/getting-started/project-structure#route-groups-and-private-folders
 */
const isGroupSegment = (segment: string | number): boolean => {
  if (typeof segment !== "string") return false;

  return segment.startsWith("(") && segment.endsWith(")");
};

/**
 * Build a typed API route path from segments
 */
export const buildRoutePath = (segments: (string | number)[], basePrefix: string = ""): string => {
  const path = segments
    .filter((s) => !isGroupSegment(s))
    .map((s) => String(s))
    .join("/");
  const result = [basePrefix, path].filter(Boolean).join("/");
  // Replace consecutive slashes with a single slash
  return result.replace(/\/+/g, "/");
};

/**
 * Determine if a key is a metadata key used in route structure
 *
 * @param key - The key to check
 * @returns True if the key is a metadata key, false otherwise
 */
export const isMetadataKey = (key: string): key is MetadataKey =>
  (["$$param", "$$route"] satisfies MetadataKey[]).includes(key as MetadataKey);

/**
 * Strip parentheses from a string (used for route group names in Next.js)
 *
 * @param s - The string to strip parentheses from
 * @returns The input string with all parentheses removed
 */
const stripParens = (s: string) => s.replace(/[()]/g, "");

/**
 * Construct the builder key for a given route segment key,
 * preserving $ prefix for parameters and converting to camelCase
 * for builder properties.
 *
 * @param key - The route segment key
 * @returns The constructed builder key
 */
const constructBuilderKey = (key: string): string => {
  const isDynamicKey = key.startsWith("$");
  const rawForBuilder = isDynamicKey ? key.slice(1) : key;
  const transformedKey = camelCase(stripParens(rawForBuilder));
  return [isDynamicKey && "$", transformedKey].filter(Boolean).join("");
};

/**
 * Recursively build route builder functions from route structure
 */
export const createRouteBuilder = <T extends Record<string, any>, TMap = Record<string, never>>(
  structure: T,
  basePath: (string | number)[] = [],
  basePrefix: string = "",
): RouteBuilderObject<T, TMap> => {
  const builder: Record<string, any> = {};

  for (const [key, value] of Object.entries(structure)) {
    // Skip metadata keys
    if (isMetadataKey(key)) continue;

    if (typeof value !== "object") {
      continue;
    }

    const builderKey = constructBuilderKey(key);
    const currentPath = [...basePath, key];

    const hasRoute = value.$$route === true;
    const hasParam = ("$$param" satisfies MetadataKey) in value;

    // Check if there are children (non-metadata keys)
    const childKeys = Object.keys(value).filter((k) => !isMetadataKey(k));
    const hasChildren = childKeys.length > 0;

    if (hasParam) {
      // This level has a parameter
      builder[builderKey] = (param: string | number) => {
        const paramPath = [...currentPath.slice(0, -1), param];

        if (hasChildren) {
          // Has children, build them with the parameter in the path
          const children = createRouteBuilder(value, paramPath, basePrefix);

          // If this level is also a route, add a $ method
          if (hasRoute) {
            Object.assign(children, { $: () => buildRoutePath(paramPath, basePrefix) });
          }

          return children;
        } else if (hasRoute) {
          // Leaf route with parameter
          return buildRoutePath(paramPath, basePrefix);
        }

        return buildRoutePath(paramPath, basePrefix);
      };
    } else if (hasRoute && !hasChildren) {
      // Leaf route with no children or params
      builder[builderKey] = () => buildRoutePath(currentPath, basePrefix);
    } else {
      // Has children, recurse
      const children = createRouteBuilder(value, currentPath, basePrefix);
      if (hasRoute) {
        // Also a route itself
        Object.assign(children, { $: () => buildRoutePath(currentPath, basePrefix) });
      }
      builder[builderKey] = children;
    }
  }

  return builder as RouteBuilderObject<T, TMap>;
};
