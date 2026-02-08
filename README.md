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
- ⚙️ **Configurable**: Support for config files and CLI options
- 📦 **Zero Runtime Cost**: All types are compile-time only

## Installation

```bash
npm install next-typed-paths
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

## Configuration

Create a `routes.config.ts` file in your project root:

```typescript
import type { RouteConfig } from "next-typed-paths";

const routeConfig: RouteConfig = {
  input: "./src/app/api",
  output: "./src/generated/routes.ts",
  watch: false,
  basePrefix: "/api",
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

### Configuration Options

- **`input`** (`string`, required): The directory path to scan for route files. This should point to your Next.js API routes directory (e.g., `./src/app/api` or `./src/app`). You can use next-typed-paths for just your REST API backend or also for any page routes that return UI.

- **`output`** (`string`, required): The file path where the generated TypeScript routes file will be written. This file will contain all your type-safe route builders.

- **`watch`** (`boolean`, optional): When set to `true`, the generator will run in watch mode and automatically regenerate routes whenever files change in the input directory. Defaults to `false`.

- **`basePrefix`** (`string`, optional): A prefix that will be prepended to all generated routes. For example, if your API routes are under `/api`, set this to `"/api"` so generated routes include this prefix. Defaults to `""`.

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

```json
// project.json
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

It uses the directory structure to generate in realtime a typed schema of the available routes in your Next.Js application. You are still responsible for ensuring you use the route in the correct way (i.e. correct HTTP method and query params), however, the route and path params are typed for you.

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
