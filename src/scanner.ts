/**
 * Scanner for Next.js app directory structure
 */

import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { join, resolve } from "path";

import { PAGE_FILE_NAME, ROUTE_FILE_EXTENSIONS, ROUTE_FILE_NAME } from "@/constants";
import { RouteNode } from "@/runtime";

/**
 * Check if a directory contains a route.ts or page.ts file
 */
const hasRouteFile = async (dirPath: string): Promise<boolean> => {
  const fileNames = [ROUTE_FILE_NAME, PAGE_FILE_NAME];
  const checks = await Promise.all(
    fileNames.flatMap((fileName) =>
      ROUTE_FILE_EXTENSIONS.map(async (ext) => {
        const filePath = join(dirPath, `${fileName}${ext}`);
        return existsSync(filePath);
      }),
    ),
  );
  return checks.some((exists) => exists);
};

/**
 * Extract route slug name from Next.js dynamic segment [slug]
 */
const extractDynamicRouteSlug = (segment: string): string | undefined => {
  const match = segment.match(/^\[(.+)\]$/);
  return match?.[1];
};

/**
 * Convert route slug name from Next.js format to camelCase with $ prefix
 * e.g., [userId] -> $userId, [user-id] -> $userId
 */
const formatParamName = (paramName: string): string => {
  // Convert kebab-case to camelCase
  const camelCased = paramName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return `$${camelCased}`;
};

/**
 * Recursively scan a directory and build route structure
 */
export const scanDirectory = async (dirPath: string, basePath: string = ""): Promise<RouteNode> => {
  const node: RouteNode = {};

  if (!existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  // Check if this directory itself has a route
  if (await hasRouteFile(dirPath)) {
    node.$route = true;
  }

  // Read directory contents
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip non-directories and special directories
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    const dirName = entry.name;

    // Skip private routes
    // See https://nextjs.org/docs/app/getting-started/project-structure#route-groups-and-private-folders
    if (dirName.startsWith("_")) {
      continue;
    }

    const entryPath = join(dirPath, dirName);
    const paramName = extractDynamicRouteSlug(dirName);
    if (paramName) {
      // Dynamic segment [paramName]
      const formattedName = formatParamName(paramName);
      const childNode = await scanDirectory(entryPath, `${basePath}/${dirName}`);
      childNode.$param = paramName;
      node[formattedName] = childNode;
    } else {
      // Static segment - keep original name
      const childNode = await scanDirectory(entryPath, `${basePath}/${dirName}`);
      node[dirName] = childNode;
    }
  }

  return node;
};

/**
 * Scan Next.js app directory and generate route structure
 */
export const generateRouteStructure = async (inputDir: string): Promise<RouteNode> => {
  const resolvedPath = resolve(inputDir);
  return scanDirectory(resolvedPath);
};
