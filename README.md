# Next Typed Paths

[![npm version](https://img.shields.io/npm/v/next-typed-paths.svg?style=flat-square)](https://www.npmjs.com/package/next-typed-paths)
[![npm downloads](https://img.shields.io/npm/dm/next-typed-paths.svg?style=flat-square)](https://www.npmjs.com/package/next-typed-paths)
[![bundle size](https://img.shields.io/bundlephobia/minzip/next-typed-paths?style=flat-square)](https://bundlephobia.com/package/next-typed-paths)
[![license](https://img.shields.io/npm/l/next-typed-paths.svg?style=flat-square)](https://github.com/hugs7/next-typed-paths/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

Type-safe Next.js App Router route builder with automatic generation from your file system.

## Features

- 🔒 **Fully Type-Safe**: Get autocomplete and type checking for all your routes
- 🔄 **Auto-Generated**: Scans your Next.js app directory and generates routes automatically
- 👀 **Live Updates**: Watch mode regenerates routes when files change
- 🔗 **End-to-End Contracts**: One Zod contract types paths, handlers, requests, and responses
- ⚙️ **Configurable**: Support for config files and CLI options
- 📦 **Small Runtime**: Contract metadata is erased from generated browser code

## Installation

```bash
npm install next-typed-paths zod
```

Even though the generation happens at build time, you will still need this package at runtime since it constructs a runtime object: your route structure. Hence ensure you install **without** the `-D` flag via npm.

Axios support is optional. Install Axios only when using the `next-typed-paths/axios` entry point:

```bash
npm install axios
```

## Quick Start

### 1. Generate Routes

```bash
npx next-typed-paths generate --input ./src/app/api --output ./src/generated/routes.ts
```

### 2. Use in Your Code

```typescript
import { routes } from "./generated/routes";

// Type-safe route building
const userRoute = routes.api.users.$userId("123"); // "/api/users/123"
const listRoute = routes.api.users.$(); // "/api/users"
```

## End-to-end route contracts

Export one method-keyed `routeContract` from an App Router `route.ts`. Request callers use each schema's Zod input
type, while validated handlers receive its parsed output type. Responses are discriminated by status.

```typescript
// src/app/api/users/[userId]/route.ts
import { z } from "zod";

import { defineRouteContract, jsonResponse, routeJson } from "next-typed-paths/contracts";
import { createRouteHandler } from "next-typed-paths/next";

const params = z.object({ userId: z.string().uuid() });

export const routeContract = defineRouteContract({
  GET: {
    params,
    query: z.object({ includePermissions: z.coerce.boolean().optional() }),
    responses: {
      200: jsonResponse(z.object({ id: z.string().uuid(), name: z.string() })),
      404: jsonResponse(z.object({ message: z.string() })),
    },
  },
  PATCH: {
    params,
    body: z.object({ name: z.string().trim().min(1) }),
    responses: {
      200: jsonResponse(z.object({ id: z.string().uuid(), name: z.string() })),
      404: jsonResponse(z.object({ message: z.string() })),
    },
  },
});

export const GET = createRouteHandler(routeContract.GET, async ({ input }) => {
  const user = await findUser(input.params.userId, input.query.includePermissions);
  if (!user) return routeJson(routeContract.GET, 404, { message: "Not found" });
  return routeJson(routeContract.GET, 200, user);
});
```

The adapter is optional. Contract request fields deliberately sit at the method-contract top level, so an existing
middleware composer can consume the exact same value without next-typed-paths depending on that middleware:

```typescript
export const PATCH = createSiteValidatedRoute(routeContract.PATCH)(async ({ input }) => {
  // input.params and input.body are inferred Zod outputs
});
```

`parseRouteRequest(routeContract.PATCH, request, context)` is available when a custom composer needs a lower-level
integration. `routeJson` and `routeNoContent` enforce declared status/content-type combinations.

After generation, each contracted node in the route structure carries its schemas under `$$contract`. `RouteBuilderObject`
therefore derives paths and API types from one structure without a separate contract type parameter. The generator chooses
where those schemas come from based on where the output lives:

- **Internal output** imports each route's `routeContract` and assigns it directly to `$$contract`.
- **External output** emits standalone Zod schemas and assigns a generated contract to `$$contract`, so the generated file can be
  published from a shared package without importing the Next.js application.

Set `contractMode` explicitly when the automatic project-boundary detection does not match your monorepo layout. The
client restricts methods and infers request and status-specific response types from the same generated structure:

```typescript
import { createFetchTransport, createRouteClient } from "next-typed-paths/client";

import { ROUTES } from "./generated/routes";

const api = createRouteClient({ transport: createFetchTransport() });
const response = await api.request(ROUTES.users.$userId(userId), "PATCH", {
  body: { name: "Ada" },
});

if (response.status === 200) response.data.name;
if (response.status === 404) response.data.message;
```

For a chainable version of the same contract-aware client, wrap the generated routes once:

```typescript
import { createFetchTransport, createRouteApi, createRouteClient } from "next-typed-paths/client";

import { ROUTES } from "./generated/routes";

const client = createRouteClient({ transport: createFetchTransport() });
const routeApi = createRouteApi(ROUTES, client);

const response = await routeApi.users.$userId(userId).PATCH({ body: { name: "Ada" } });
```

The client also accepts application-owned transports and query serializers. Zod response validation is performed by
server helpers; the browser path runtime and base client do not import Zod.

### Axios

`next-typed-paths/axios` injects an application-owned Axios instance. Its defaults, adapters, authentication, and
interceptors remain under application control:

```typescript
import axios from "axios";
import { createAxiosRouteApi } from "next-typed-paths/axios";

import { ROUTES } from "./generated/routes";

const authenticatedApi = axios.create();
authenticatedApi.interceptors.request.use(addAuthentication);

export const routeApi = createAxiosRouteApi(ROUTES, authenticatedApi);

export const updateUser = (userId: string, name: string) =>
  routeApi.users
    .$userId(userId)
    .PATCH({ body: { name } })
    .then((response) => response.data);
```

Query input is passed to Axios as `params`, JSON or form input as `data`, and per-request Axios options can be supplied
under `config`. Axios's normal non-2xx rejection is retained, so errors can continue to flow through shared interceptors
or query-library error handlers rather than being handled in every request. The resolved response type contains only
declared 2xx statuses; `AxiosRouteError` and `AxiosRouteErrorData` are exported for applications that need to type a
central error boundary.

The generated method, params, query, body, and declared response types all come from the exact exported `routeContract`.
The server remains the runtime trust boundary: it validates request input with Zod, while Axios trusts the server's
response by default instead of downloading and running response schemas in the browser.

### Paths, pages, and API contracts

The generated route builder remains the smallest API and works for every discovered `page.tsx` and `route.ts`:

```typescript
router.push(ROUTES.settings.profile());
const endpoint = ROUTES.api.users.$userId(userId);
```

Contracts are discovered only from `routeContract` exports in App Router `route.ts` files. A `page.tsx` route, or an API
route without a contract, remains available through the path builder but does not gain HTTP methods on `createRouteApi`
or `createAxiosRouteApi`. This keeps UI routes path-only while allowing contracted API routes to expose multiple methods
from the same file.

Common error schemas belong in an application-owned contracts module and can be reused by every route. The package does
not prescribe an error shape because `{ error: string }`, validation details, and authentication errors are application
conventions rather than Next.js route semantics.

### Testing a canary

Before the updated release workflow exists on the default branch, add the `publish-canary` label to a same-repository
pull request. After it is merged, run **Release new NPM version** from GitHub Actions and select the branch to publish.
Both paths verify the package, publish a unique `1.0.0-alpha.<run>.<attempt>.<sha>` version under the `alpha` dist-tag,
and print the exact install command in the workflow summary. npm trusted publishing must authorize `release.yml` for
`hugs7/next-typed-paths`; no long-lived npm token is required.

For a pnpm workspace such as Pleo, install the printed version and regenerate routes:

```bash
pnpm add --workspace-root next-typed-paths@1.0.0-alpha.<run>.<attempt>.<sha>
pnpm routes:generate
```

## Configuration

Create a `routes.config.ts` file in your project root (`routes.config.cts`/`.mts`/`.js`/`.cjs`/`.mjs` are detected too):

```typescript
import type { RouteConfig } from "next-typed-paths";

const routeConfig: RouteConfig = {
  input: "./src/app/api",
  output: "./src/generated/routes.ts",
  watch: false,
  contracts: true,
  paramTypeMap: {
    type: "RouteParamTypeMap",
    from: "../types/params",
  },
};

export default routeConfig;
```

Then create your parameter types file:

```typescript
// src/types/params.ts
export type RouteParamTypeMap = {
  userId: string;
  postId: number;
  teamId: `team_${string}`;
};
```

### Multiple Configurations

You can export multiple configurations to generate routes for different parts of your application:

```typescript
import type { RouteConfig } from "next-typed-paths";

const configs: RouteConfig[] = [
  {
    input: "./src/app/api",
    output: "./src/generated/api-routes.ts",
    routesName: "apiRoutes",
  },
  {
    input: "./src/app/(dashboard)",
    output: "./src/generated/dashboard-routes.ts",
    routesName: "dashboardRoutes",
  },
];

export default configs;
```

### Configuration Options

- **`input`** (`string`, required): The directory path to scan for route files. This should point to your Next.js API routes directory (e.g., `./src/app/api` or `./src/app`). You can use next-typed-paths for just your REST API backend or also for any page routes that return UI.

- **`output`** (`string`, required): The file path where the generated TypeScript routes file will be written. This file will contain all your type-safe route builders.

- **`watch`** (`boolean`, optional): When set to `true`, the generator will run in watch mode and automatically regenerate routes whenever files change in the input directory. Defaults to `false`.

- **`basePrefix`** (`string`, optional): A prefix that will be prepended to all generated routes. **Automatically computed** from the input path - everything after `/app/` becomes the prefix. For example:
  - `input: "./app/api"` → `basePrefix: "/api"`
  - `input: "./src/app/api/v2"` → `basePrefix: "/api/v2"`
  - Falls back to `"/"` if the path cannot be parsed

  You can manually override the automatic calculation by explicitly setting this value.

- **`paramTypeMap`** (`object`, optional): Configuration for importing custom parameter types from your codebase. This allows you to define parameter types as a proper TypeScript interface with full IDE support, including complex types like unions, branded types, template literals, etc.
  - **`type`** (`string`): The name of the exported type/interface to import
  - **`from`** (`string`): The module path to import from (**relative to the generated output file**)
  - Example:
    ```typescript
    paramTypeMap: {
      type: "RouteParamTypeMap",
      from: "./params"
    }
    ```
  - Any parameter not defined in your type map will default to `string` type.
- **`routesName`** (`string`, optional): The name for the generated routes constant and type. The constant will be UPPERCASED (e.g., `"routes"` becomes `const ROUTES`), and the type will be PascalCased (e.g., `type Routes`). Defaults to `"routes"`.
- **`contracts`** (`boolean`, optional): Discover route contracts and embed their resolved request and response types in route nodes. Set to `false` for path-only output. Defaults to `true`.
- **`contractMode`** (`"auto" | "internal" | "external"`, optional): Controls contract generation. `internal` assigns imported App Router contracts to each route node; `external` generates standalone Zod schemas and equivalent contracts; `auto` selects `internal` when the output is inside the Next.js project and `external` otherwise. Defaults to `auto`.
- **`imports`** (`string[]`, optional): An array of import statements to include at the top of the generated routes file. Useful if your route builders need to reference custom types or utilities. For example, `["import { z } from 'zod';", "import type { User } from './types';"]`. Defaults to `[]`.

## CLI Commands

### Generate Routes

```bash
npx next-typed-paths generate [options]
```

Options:

- `-i, --input <path>`: Input directory to scan (default: "./app/api")
- `-o, --output <path>`: Output file path (default: "./generated/routes.ts")
- `-w, --watch`: Watch for changes and regenerate
- `-c, --config <path>`: Path to config file

### Watch Mode

```bash
npx next-typed-paths generate --watch
```

This will watch your app directory and automatically regenerate routes when files change.

### Integration with Development Workflow

You can integrate the route generator into your development workflow to automatically regenerate routes alongside your dev server. For example, if you are using [Nx](https://github.com/nrwl/nx), you can run both the Next.js dev server and the route generator in parallel:

NX _project.json_

```json
{
  "name": "your-next-app",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/your-next-app",
  "projectType": "application",
  "targets": {
    "dev": {
      "executor": "nx:run-commands",
      "options": {
        "commands": ["next dev", "npx next-typed-paths generate --watch"],
        "parallel": true
      }
    },
    "build": {
      "executor": "@nx/next:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/your-next-app"
      }
    }
  }
}
```

By no means do you have to use Nx. You could use a more lightweight tool like [concurrently](https://github.com/open-cli-tools/concurrently), for example.

With `"parallel": true`, both commands run simultaneously:

- `next dev` starts your Next.js development server
- `npx next-typed-paths generate --watch` watches for route file changes and regenerates types

This ensures your route types stay in sync with your file system as you develop.

## How It Works

The generator scans your Next.js app directory structure:

```
app/api/
├── users/
│   ├── route.ts              → routes.api.users.$()
│   └── [userId]/
│       └── route.ts          → routes.api.users.$userId(id)
└── posts/
    ├── route.ts              → routes.api.posts.$()
    └── [postId]/
        ├── route.ts          → routes.api.posts.$postId(id)
        └── comments/
            └── route.ts      → routes.api.posts.$postId(id).comments()
```

It uses the directory structure to generate a typed schema of the available routes in your Next.js application. Routes that export `routeContract` also carry method, request, and response types; routes without contracts retain the existing path-only behavior.

## Migrating from v0.x

1. Install Zod 4 alongside next-typed-paths: `npm install zod@^4`.
2. Regenerate routes. Existing routes and the two-generic `RouteBuilderObject<Structure, ParamTypeMap>` API remain valid.
3. Add `routeContract` exports incrementally. A contract's `params` schema becomes authoritative for that API route;
   `paramTypeMap` remains the fallback for pages and uncontracted routes.
4. Import contract helpers from `next-typed-paths/contracts`, the optional handler from `next-typed-paths/next`, and the
   transport-independent client from `next-typed-paths/client`.
5. Describe JSON wire values in response schemas. `body` and `formData` are intentionally mutually exclusive per method.

## Examples

### Basic Usage

```typescript
import { routes } from "./generated/routes";

// Static routes
routes.api.auth.login(); // "/api/auth/login"

// Dynamic routes with typed parameters
routes.api.users.$userId("123"); // "/api/users/123"
routes.api.posts.$postId(456); // "/api/posts/456" - number type from RouteParamTypeMap

// Nested dynamic routes
routes.api.posts.$postId("456").comments(); // "/api/posts/456/comments"

// Access parent route
routes.api.users.$userId("123").$(); // "/api/users/123"

// Routes with children and self
routes.api.users.$(); // "/api/users"
routes.api.users.$userId("123"); // "/api/users/123"
```

### Custom Parameter Types

Define strict parameter types for better type safety:

```typescript
// params.ts
export interface RouteParamTypeMap {
  userId: string;
  postId: number;
  teamId: `team_${string}`; // Branded string type
  status: "active" | "inactive"; // Union type
}

// Usage - TypeScript enforces your parameter types
routes.api.teams.$teamId("team_123"); // ✅ Valid
routes.api.teams.$teamId("123"); // ❌ Type error - must start with "team_"
routes.api.posts.$postId(456); // ✅ Valid - number type
routes.api.posts.$postId("456"); // ❌ Type error - must be number
```

### With Next.js

By no means are the following examples an indication you are pinned to using certain libraries (e.g. Axios, Tanstack Query). Rather I provide some examples within the context of some common patterns.

#### In Client Components

```typescript
'use client';

import { useState } from "react";

import axios from "axios";

import { User } from "@/common/types";
import { routes } from '@/generated/routes';

export const UsersList = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Type-safe API calls from the client
    axios.get(routes.api.users.$())
      .then(res => res.data)
      .then(setUsers);
  }, []);

  return <div>{/* render users */}</div>;
};
```

#### In Server Components

```typescript
const UserProfile = async ({ userId }: { userId: string }) => {
  // Call your API with type-safe routes
  const { data: user } = await axios.get(routes.api.users.$userId(userId));
  return <div>{user.name}</div>;
};
```

#### For redirects

```typescript
import { redirect } from "next/navigation";

const handleLogin = (userId: string) => {
  redirect(routes.api.auth.callback.$());
};
```

#### Building URLs for links

```typescript
const UserLink = ({ userId }: { userId: string }) => {
  return <a href={routes.api.users.$userId(userId)}>View Profile</a>;
};
```

#### With [TanStack Query](https://github.com/TanStack/query)

```typescript
import { useQuery } from '@tanstack/react-query';

const UserProfile = ({ userId }: { userId: string }) => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => axios.get(routes.api.users.$userId(userId)).then(res => res.data),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
};
```

## License

MIT
