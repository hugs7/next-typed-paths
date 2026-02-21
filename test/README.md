# Test Directory

This directory contains an e2e test setup for next-typed-paths.

## Structure

```
test/
├── routes.config.ts          # Configuration with paramTypeMap
├── params.ts                 # Custom parameter type definitions
├── app/api/                  # Mock Next.js API routes
|   ├── (collections)/        # Group routes are retained in structure but ignored in constructed paths
│   │   │── posts/
│   │   │   └── [postId]/route.ts
│   │   └── users/
│   │       ├── [userId]/route.ts
│   │       └── route.ts
|   └── hyphened-route/
│       │── _private/         # Private routes are ignored
│       │   └── route.ts
│       └── route.ts
└── generated/                # Output directory (generated)
```

## Usage

Run from project root:

```bash
npm run build
node dist/cli.js generate --config ./test/routes.config.ts
```

This will generate type-safe routes in `test/generated/routes.ts` with custom parameter types from `params.ts`.
