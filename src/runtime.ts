/**
 * Core route builder runtime
 */

import type { RouteBuilderObject } from "./types";

/**
 * Build a typed API route path from segments
 */
export const buildRoutePath = (segments: (string | number)[], basePrefix: string = ""): string => {
  const path = segments.map((s) => String(s)).join("/");
  return basePrefix ? `${basePrefix}/${path}` : `/${path}`;
};

/**
 * Recursively build route builder functions from route structure
 */
export const createRouteBuilder = <T extends Record<string, any>, TMap = Record<string, never>>(
  structure: T,
  basePath: (string | number)[] = [],
  basePrefix: string = "",
): RouteBuilderObject<T, TMap> => {
  const builder = {} as RouteBuilderObject<T, TMap>;

  for (const [key, value] of Object.entries(structure)) {
    // Skip metadata keys
    if (key === "$param" || key === "$route" || key === "$segment") continue;

    // Use $segment if available (original hyphenated name), otherwise use key
    const urlSegment = value?.$segment ?? key;
    const currentPath = [...basePath, urlSegment];

    if (typeof value === "object") {
      const hasRoute = value.$route === true;
      const hasParam = "$param" in value;

      // Check if there are children (non-metadata keys)
      const childKeys = Object.keys(value).filter((k) => !k.startsWith("$"));
      const hasChildren = childKeys.length > 0;

      if (hasParam) {
        // This level has a parameter
        (builder as any)[key] = (param: string | number) => {
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
        (builder as any)[key] = () => buildRoutePath(currentPath, basePrefix);
      } else {
        // Has children, recurse
        const children = createRouteBuilder(value, currentPath, basePrefix);
        if (hasRoute) {
          // Also a route itself
          Object.assign(children, { $: () => buildRoutePath(currentPath, basePrefix) });
        }
        (builder as any)[key] = children;
      }
    }
  }

  return builder;
};
