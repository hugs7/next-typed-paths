/**
 * Scanner for Next.js app directory structure
 */

import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { camelCase } from "es-toolkit";
import { dirname, join, parse, resolve } from "path";
import { Node, Project, SourceFile } from "ts-morph";

import { PAGE_FILE_NAME, ROUTE_FILE_EXTENSIONS, ROUTE_FILE_NAME } from "@/constants";
import { ResolvedContractMethod, resolveRouteContractsSchemas } from "@/contractType";
import { RouteNode } from "@/runtime";

export type RouteContractReference = {
  methods: ResolvedContractMethod[];
  segments: string[];
  sourcePath: string;
};

export type RouteManifest = {
  contracts: RouteContractReference[];
  structure: RouteNode;
};

export type RouteContractCache = Map<
  string,
  {
    methods: ResolvedContractMethod[];
    sourceText: string;
  }
>;

type PendingRouteContract = Omit<RouteContractReference, "methods"> & {
  sourceFile: SourceFile;
};

/**
 * Check if a directory contains a route.ts or page.ts file
 */
const findRouteFile = (dirPath: string, fileName: string): string | undefined => {
  for (const extension of ROUTE_FILE_EXTENSIONS) {
    const filePath = join(dirPath, `${fileName}${extension}`);
    if (existsSync(filePath)) return filePath;
  }
};

const hasRouteFile = async (dirPath: string): Promise<boolean> => {
  const fileNames = [ROUTE_FILE_NAME, PAGE_FILE_NAME];
  return fileNames.some((fileName) => findRouteFile(dirPath, fileName));
};

const HTTP_METHODS = new Set(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]);

const hasExportedDeclaration = (sourceFile: SourceFile, name: string): boolean =>
  sourceFile.getVariableDeclaration(name)?.getVariableStatement()?.isExported() === true ||
  sourceFile.getFunction(name)?.isExported() === true ||
  sourceFile
    .getExportDeclarations()
    .flatMap((declaration) => declaration.getNamedExports())
    .some((namedExport) => (namedExport.getAliasNode() ?? namedExport.getNameNode()).getText() === name);

const hasRouteContract = (sourceFile: SourceFile): boolean => hasExportedDeclaration(sourceFile, "routeContract");

const getContractMethods = (sourceFile: SourceFile): string[] => {
  const declaration = sourceFile.getVariableDeclaration("routeContract");
  if (!declaration) return [];

  const initializer = declaration.getInitializer();
  const contract = Node.isCallExpression(initializer) ? initializer.getArguments()[0] : initializer;
  if (!Node.isObjectLiteralExpression(contract)) return [];

  return contract
    .getProperties()
    .filter(Node.isPropertyAssignment)
    .map((property) => property.getName())
    .filter((name) => HTTP_METHODS.has(name));
};

const validateContractMethods = (sourceFile: SourceFile): void => {
  const missingMethods = getContractMethods(sourceFile).filter((method) => !hasExportedDeclaration(sourceFile, method));
  if (missingMethods.length > 0) {
    throw new Error(
      `${sourceFile.getFilePath()} declares ${missingMethods.join(", ")} in routeContract but does not export matching route handlers`,
    );
  }
};

/**
 * Extract route slug name from Next.js dynamic segment [slug]
 */
type DynamicRouteSegment = {
  catchAll: boolean;
  optional: boolean;
  paramName: string;
};

const extractDynamicRouteSegment = (segment: string): DynamicRouteSegment | undefined => {
  const optionalCatchAll = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optionalCatchAll?.[1]) return { catchAll: true, optional: true, paramName: optionalCatchAll[1] };

  const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll?.[1]) return { catchAll: true, optional: false, paramName: catchAll[1] };

  const dynamic = segment.match(/^\[(.+)\]$/);
  if (dynamic?.[1]) return { catchAll: false, optional: false, paramName: dynamic[1] };
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

const getBuilderKey = (routeKey: string): string => {
  const dynamicPrefix = routeKey.startsWith("$") ? "$" : "";
  return `${dynamicPrefix}${camelCase(routeKey.replace(/^\$/, "").replace(/[()]/g, ""))}`;
};

/**
 * Recursively scan a directory and build route structure
 */
const scanDirectoryNode = async (
  dirPath: string,
  segments: string[],
  contracts: PendingRouteContract[],
  paramNames: Set<string>,
  discoverContracts: boolean,
  project?: Project,
): Promise<RouteNode> => {
  const node: RouteNode = {};

  if (!existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  // Check if this directory itself has a route
  if (await hasRouteFile(dirPath)) {
    node.$$route = true;
  }

  const routeFile = discoverContracts ? findRouteFile(dirPath, ROUTE_FILE_NAME) : undefined;
  if (routeFile) {
    if (!project) throw new Error("Contract discovery requires a TypeScript project");
    const sourceFile = project.addSourceFileAtPath(routeFile);
    if (hasRouteContract(sourceFile)) {
      validateContractMethods(sourceFile);
      contracts.push({
        segments,
        sourceFile,
        sourcePath: sourceFile.getFilePath(),
      });
    }
  }

  // Read directory contents
  const entries = await readdir(dirPath, { withFileTypes: true }).then((entries) => {
    const filtered = entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => {
        const dirName = entry.name;

        // Skip private routes
        // See https://nextjs.org/docs/app/getting-started/project-structure#route-groups-and-private-folders
        const isPrivateRoute = dirName.startsWith("_");

        return !(isPrivateRoute || dirName.startsWith(".") || dirName === "node_modules");
      })
      // readdir results in different order on different platforms.
      // Hence, sort results for stable entry order.
      .sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  });

  const builderKeys = new Set<string>();
  for (const entry of entries) {
    const dirName = entry.name;

    const entryPath = join(dirPath, dirName);
    const dynamicSegment = extractDynamicRouteSegment(dirName);
    const routeKey = dynamicSegment ? formatParamName(dynamicSegment.paramName) : dirName;
    const builderKey = getBuilderKey(routeKey);
    if (builderKeys.has(builderKey)) {
      throw new Error(`${dirPath} contains route segments that both generate the builder key ${builderKey}`);
    }
    builderKeys.add(builderKey);

    if (dynamicSegment) {
      // Dynamic segment [paramName]
      if (paramNames.has(dynamicSegment.paramName)) {
        throw new Error(`${entryPath} duplicates the dynamic parameter ${dynamicSegment.paramName}`);
      }

      const childNode = await scanDirectoryNode(
        entryPath,
        [...segments, routeKey],
        contracts,
        new Set([...paramNames, dynamicSegment.paramName]),
        discoverContracts,
        project,
      );
      childNode.$$param = dynamicSegment.paramName;
      if (dynamicSegment.catchAll) childNode.$$catchAll = true;
      if (dynamicSegment.optional) childNode.$$optionalCatchAll = true;
      node[routeKey] = childNode;
    } else {
      // Static segment - keep original name
      const childNode = await scanDirectoryNode(
        entryPath,
        [...segments, dirName],
        contracts,
        paramNames,
        discoverContracts,
        project,
      );
      node[dirName] = childNode;
    }
  }

  return node;
};

/**
 * Recursively scan a directory and build route structure.
 */
export const scanDirectory = async (dirPath: string): Promise<RouteNode> => {
  const { structure } = await generateRouteManifest(dirPath, false);
  return structure;
};

/**
 * Scan route structure and statically discover exported route contracts.
 */
export const generateRouteManifest = async (
  inputDir: string,
  discoverContracts: boolean = true,
  emitContractSchemas: boolean = true,
  contractCache?: RouteContractCache,
): Promise<RouteManifest> => {
  const resolvedPath = resolve(inputDir);
  const pendingContracts: PendingRouteContract[] = [];
  let directory = resolvedPath;
  while (!existsSync(join(directory, "tsconfig.json")) && directory !== parse(directory).root) {
    directory = dirname(directory);
  }
  const tsConfigFilePath = join(directory, "tsconfig.json");
  const project = discoverContracts
    ? new Project({
        ...(existsSync(tsConfigFilePath) ? { tsConfigFilePath } : {}),
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
      })
    : undefined;
  const structure = await scanDirectoryNode(resolvedPath, [], pendingContracts, new Set(), discoverContracts, project);

  const cachedMethods = new Map<string, ResolvedContractMethod[]>();
  if (emitContractSchemas && contractCache && project) {
    for (const contract of pendingContracts) {
      const cached = contractCache.get(contract.sourcePath);
      if (cached?.sourceText === contract.sourceFile.getFullText()) {
        cachedMethods.set(contract.sourcePath, cached.methods);
        project.removeSourceFile(contract.sourceFile);
      }
    }
  }

  if (emitContractSchemas && cachedMethods.size < pendingContracts.length) {
    project?.resolveSourceFileDependencies();
  }

  const unresolvedContracts = pendingContracts.filter((contract) => !cachedMethods.has(contract.sourcePath));
  const resolvedMethods = emitContractSchemas
    ? new Map(
        resolveRouteContractsSchemas(
          project!,
          unresolvedContracts.map((contract) => contract.sourceFile),
        ).map((contract, index) => [unresolvedContracts[index]!.sourcePath, contract.methods]),
      )
    : new Map<string, ResolvedContractMethod[]>();

  const contracts = pendingContracts.map(({ sourceFile, ...contract }) => {
    try {
      const methods =
        cachedMethods.get(contract.sourcePath) ??
        (emitContractSchemas ? resolvedMethods.get(contract.sourcePath)! : []);
      if (emitContractSchemas && contractCache && !cachedMethods.has(contract.sourcePath)) {
        contractCache.set(contract.sourcePath, { methods, sourceText: sourceFile.getFullText() });
      }
      return { ...contract, methods };
    } catch (error) {
      throw new Error(`Failed to resolve route contract in ${sourceFile.getFilePath()}`, { cause: error });
    }
  });

  return { contracts, structure };
};

/**
 * Scan Next.js app directory and generate route structure
 */
export const generateRouteStructure = async (inputDir: string): Promise<RouteNode> => {
  return scanDirectory(inputDir);
};
