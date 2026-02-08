/**
 * Scanner for Next.js app directory structure
 */

import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { camelCase } from "lodash-es";
import { join, resolve } from "path";

import { PAGE_FILE_NAME, ROUTE_FILE_EXTENSIONS, ROUTE_FILE_NAME } from "./constants";
import { RouteNode } from "./types";

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
 * Extract parameter name from Next.js dynamic segment [paramName]
 */
const extractParamName = (segment: string): string | null => {
  const match = segment.match(/^\[(.+)\]$/);
  return match ? (match[1] ?? null) : null;
};

/**
 * Convert parameter name from Next.js format to camelCase with $ prefix
 * e.g., [userId] -> $userId, [user-id] -> $userId
 */
const formatParamName = (paramName: string): string => {
  // Convert kebab-case to camelCase
  const camelCased = paramName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return `$${camelCased}`;
};

/**
 * Transform static segment name to camelCase for TypeScript property access
 * e.g., "theatre-list" -> "theatreList", "hyphened-route" -> "hyphenedRoute"
 */
const transformSegmentName = (segmentName: string): { key: string; original: string } => {
  const camelCased = camelCase(segmentName);
  return {
    key: camelCased,
    original: segmentName,
  };
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

    const entryPath = join(dirPath, entry.name);
    const paramName = extractParamName(entry.name);

    if (paramName) {
      // Dynamic segment [paramName]
      const formattedName = formatParamName(paramName);
      const childNode = await scanDirectory(entryPath, `${basePath}/${entry.name}`);
      childNode.$param = paramName;
      node[formattedName] = childNode;
    } else {
      // Static segment - transform to camelCase
      const { key, original } = transformSegmentName(entry.name);
      const childNode = await scanDirectory(entryPath, `${basePath}/${entry.name}`);
      // Store original name if it differs from the camelCase key
      if (key !== original) {
        childNode.$segment = original;
      }
      node[key] = childNode;
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
