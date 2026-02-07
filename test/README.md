# Test Directory

This directory contains a test setup for next-typed-paths.

## Structure

```
test/
├── routes.config.ts          # Configuration with paramTypeMap
├── params.ts                 # Custom parameter type definitions
├── app/api/                  # Mock Next.js API routes
│   ├── users/
│   │   ├── route.ts
│   │   └── [userId]/route.ts
│   └── posts/
│       └── [postId]/route.ts
└── generated/                # Output directory (generated)
```

## Usage

Run from project root:

```bash
npm run build
node dist/cli.js generate --config ./test/routes.config.ts
```

This will generate type-safe routes in `test/generated/routes.ts` with custom parameter types from `params.ts`.
