/// <reference types="vite/client" />

/**
 * Injected at build time by Vite (see `define` in vite.config.ts).
 * Falls back at runtime should never happen — if undefined, the build is broken.
 */
declare const __PACKAGE_VERSION__: string;
