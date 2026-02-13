/**
 * File watcher for live route regeneration
 */

import { watch } from "chokidar";
import { basename, relative, resolve } from "path";

import { ROUTE_FILE_NAME, WATCH_DEBOUNCE_MS } from "@/constants";
import { RouteConfig } from "@/types";

export type RegenerateCallback = () => Promise<void>;

/**
 * Start watching the input directory for changes
 */
export const startWatcher = (config: RouteConfig, onRegenerate: RegenerateCallback): void => {
  const inputPath = resolve(config.input);

  console.log(`👀 Watching for changes in: ${inputPath}`);

  const watcher = watch(inputPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });

  let regenerateTimer: NodeJS.Timeout | null = null;

  const scheduleRegenerate = () => {
    // Debounce rapid changes
    if (regenerateTimer) {
      clearTimeout(regenerateTimer);
    }

    regenerateTimer = setTimeout(async () => {
      console.log("\n🔄 Changes detected, regenerating routes...");
      try {
        await onRegenerate();
        console.log("✅ Routes regenerated successfully");
      } catch (error) {
        console.error("❌ Failed to regenerate routes:", error);
      }
    }, WATCH_DEBOUNCE_MS);
  };

  watcher
    .on("add", (filePath) => {
      if (basename(filePath).startsWith(`${ROUTE_FILE_NAME}.`)) {
        console.log(`📝 New route file: ${relative(inputPath, filePath)}`);
        scheduleRegenerate();
      }
    })
    .on("unlink", (filePath) => {
      if (basename(filePath).startsWith(`${ROUTE_FILE_NAME}.`)) {
        console.log(`🗑️  Removed route file: ${relative(inputPath, filePath)}`);
        scheduleRegenerate();
      }
    })
    .on("addDir", (dirPath) => {
      console.log(`📁 New directory: ${relative(inputPath, dirPath)}`);
      scheduleRegenerate();
    })
    .on("unlinkDir", (dirPath) => {
      console.log(`🗑️  Removed directory: ${relative(inputPath, dirPath)}`);
      scheduleRegenerate();
    })
    .on("error", (error) => {
      console.error("❌ Watcher error:", error);
    });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n👋 Stopping watcher...");
    watcher.close();
    process.exit(0);
  });
};
