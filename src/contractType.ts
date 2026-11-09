import { API, type Checker, type Type, TypeFlags } from "@typescript/native/unstable/sync";
import { basename, dirname, join, relative } from "path";

import { createZodSchemaConverter } from "@/zodSchema";

const TYPE_HELPERS = `
import type { z } from "zod";

type RequestSchemaKey = "body" | "formData" | "params" | "query";
type SchemaAt<Contract, Key extends RequestSchemaKey> =
  Contract extends Record<Key, infer Schema extends z.ZodType> ? Schema : never;
type ConfiguredRequestKey<Contract> = {
  [Key in RequestSchemaKey]: Contract extends Record<Key, z.ZodType> ? Key : never;
}[RequestSchemaKey];
type OptionalInputKey<Contract> = {
  [Key in ConfiguredRequestKey<Contract>]: undefined extends z.input<SchemaAt<Contract, Key>> ? Key : never;
}[ConfiguredRequestKey<Contract>];
type Simplify<Value> = { [Key in keyof Value]: Value[Key] };
type ResolvedRequest<Contract> = Simplify<
  {
    [Key in Exclude<ConfiguredRequestKey<Contract>, OptionalInputKey<Contract>>]: z.input<SchemaAt<Contract, Key>>;
  } & {
    [Key in OptionalInputKey<Contract>]?: z.input<SchemaAt<Contract, Key>>;
  }
>;
type ResolvedResponse<Contract, Status extends PropertyKey> = Contract extends { responses: infer Responses }
  ? Status extends keyof Responses
    ? Responses[Status] extends { contentType: "application/json"; schema: infer Schema extends z.ZodType }
      ? z.output<Schema>
      : undefined
    : never
  : never;
type HttpMethod = "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
type ResolvedContract<Contract> = {
  [Method in keyof Contract as Method extends HttpMethod ? Method : never]: {
    request: ResolvedRequest<Contract[Method]>;
    responses: Contract[Method] extends { responses: infer Responses }
      ? { [Status in keyof Responses]: ResolvedResponse<Contract[Method], Status> }
      : never;
  };
};
`;

const HELPER_CONFIG_FILE_NAME = "tsconfig.next-typed-paths.json";

const getModuleSpecifier = (fromPath: string, toPath: string): string => {
  const path = relative(dirname(fromPath), toPath)
    .replace(/\\/g, "/")
    .replace(/\.(?:js|jsx|ts|tsx)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
};

export type ResolvedContractMethod = {
  method: string;
  requestSchema: string;
  responses: { schema: string; status: string }[];
};

export type ResolvedRouteContract = {
  methods: ResolvedContractMethod[];
};

/** Fetches the properties of each type and their types, batching the type lookups into one request. */
const getPropertyTypes = (checker: Checker, types: Type[]): { name: string; type: Type }[][] => {
  const properties = types.map((type) => checker.getPropertiesOfType(type));
  const flattened = properties.flat();
  const propertyTypes = flattened.length > 0 ? checker.getTypeOfSymbol(flattened) : [];
  let offset = 0;
  return properties.map((symbols) =>
    symbols.map((symbol) => {
      const type = propertyTypes[offset++];
      if (!type) throw new Error(`Cannot resolve the type of ${symbol.name}`);
      return { name: symbol.name, type };
    }),
  );
};

/**
 * Resolves the request and response wire schemas of route contracts with the TypeScript 7 native compiler.
 * All contracts are checked in one program built from a virtual helper module that imports every route.
 *
 * @param routeFilePaths - Absolute paths of route files exporting a `routeContract`
 * @param tsConfigFilePath - tsconfig.json providing compiler options and module resolution, if any
 * @returns The resolved contracts, in the order of `routeFilePaths`
 */
export const resolveRouteContractsSchemas = (
  routeFilePaths: string[],
  tsConfigFilePath?: string,
): ResolvedRouteContract[] => {
  const [firstRoute] = routeFilePaths;
  if (!firstRoute) return [];

  // The helper sits next to a route so that `zod` resolves exactly as it does for the routes.
  const helperPath = `${firstRoute}.next-typed-paths.ts`;
  const configPath = join(dirname(tsConfigFilePath ?? helperPath), HELPER_CONFIG_FILE_NAME);
  const config = JSON.stringify({
    ...(tsConfigFilePath ? { extends: `./${basename(tsConfigFilePath)}` } : {}),
    include: [],
    files: [helperPath],
  });

  const imports = routeFilePaths.map(
    (routeFilePath, index) =>
      `import { routeContract as contract_${index} } from ${JSON.stringify(getModuleSpecifier(helperPath, routeFilePath))};`,
  );
  let helper = `${imports.join("\n")}\n${TYPE_HELPERS}\n`;
  const aliasPositions = routeFilePaths.map((_, index) => {
    const declaration = `type Contract_${index} = ResolvedContract<typeof contract_${index}>;\n`;
    const position = helper.length + "type ".length;
    helper += declaration;
    return position;
  });

  // Only readFile is virtualized: every registered callback is a round trip per file, and module
  // resolution probes far more files than it reads.
  const api = new API({
    cwd: dirname(configPath),
    fs: {
      readFile: (fileName) => (fileName === helperPath ? helper : fileName === configPath ? config : undefined),
    },
  });

  try {
    const project = api.updateSnapshot({ openProjects: [configPath] }).getProject(configPath);
    if (!project) throw new Error(`Failed to load a TypeScript project for ${configPath}`);
    const { checker } = project;
    const toZodSchema = createZodSchemaConverter(checker);

    const contractTypes = checker.getTypeAtPosition(helperPath, aliasPositions).map((type, index) => {
      if (!type || type.flags & TypeFlags.Any) {
        throw new Error(`Failed to resolve the routeContract type of ${routeFilePaths[index]}`);
      }
      return type;
    });
    const methodsByContract = getPropertyTypes(checker, contractTypes);
    const methodParts = getPropertyTypes(
      checker,
      methodsByContract.flat().map(({ type }) => type),
    );
    const responsesByMethod = getPropertyTypes(
      checker,
      methodParts.map((parts) => {
        const responses = parts.find(({ name }) => name === "responses");
        if (!responses) throw new Error("Resolved contract method has no responses");
        return responses.type;
      }),
    );

    let methodIndex = 0;
    return methodsByContract.map((methods, contractIndex) => {
      try {
        return {
          methods: methods.map(({ name: method }) => {
            const parts = methodParts[methodIndex]!;
            const responses = responsesByMethod[methodIndex]!;
            methodIndex++;
            const request = parts.find(({ name }) => name === "request");
            if (!request) throw new Error(`Resolved contract method ${method} has no request`);
            return {
              method,
              requestSchema: toZodSchema(request.type),
              responses: responses.map(({ name: status, type }) => ({ schema: toZodSchema(type), status })),
            };
          }),
        };
      } catch (error) {
        throw new Error(`Failed to resolve route contract in ${routeFilePaths[contractIndex]}`, { cause: error });
      }
    });
  } finally {
    api.close();
  }
};
