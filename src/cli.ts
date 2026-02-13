#!/usr/bin/env node

/**
 * CLI for Next.js route generation
 */

import { Command } from "commander";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { dirname, join } from "path";

import { loadConfig, mergeConfig } from "./config";
import {
  CLI_NAME,
  CONFIG_FILE_NAME,
  DEFAULT_BASE_PREFIX,
  DEFAULT_INPUT_DIR,
  DEFAULT_OUTPUT_FILE,
  PACKAGE_NAME,
  PACKAGE_VERSION,
} from "./constants";
import { mkdirIfNotExists } from "./file";
import { generateRouteFile } from "./generator";
import { generateRouteStructure } from "./scanner";
import { RouteConfig } from "./types";
import { startWatcher } from "./watcher";

const program = new Command();

program
  .name(CLI_NAME)
  .description("Generate type-safe routes from Next.js app directory structure")
  .version(PACKAGE_VERSION);

/**
 * Generate routes from directory structure
 */
const generateRoutes = async (config: RouteConfig): Promise<void> => {
  try {
    console.log("🔍 Scanning directory:", config.input);

    // Scan directory structure
    const structure = await generateRouteStructure(config.input);

    // Generate TypeScript code
    const code = await generateRouteFile(structure, config);

    // Ensure output directory exists
    const outputDir = dirname(config.output);
    await mkdirIfNotExists(outputDir);

    // Write output file
    await writeFile(config.output, code, "utf-8");

    console.log("✅ Routes generated successfully:");
    console.log("   📁 Input:", config.input);
    console.log("   📄 Output:", config.output);
  } catch (error) {
    console.error("❌ Error generating routes:", error);
    throw error;
  }
};

/**
 * Generate command
 */
program
  .command("generate")
  .description("Generate route file from Next.js app directory")
  .option("-i, --input <path>", "Input directory to scan")
  .option("-o, --output <path>", "Output file path")
  .option("-w, --watch", "Watch for changes and regenerate")
  .option("-c, --config <path>", "Path to config file")
  .option("-p, --prefix <prefix>", "Base prefix for all routes")
  .action(async (options) => {
    // Load base config from file
    const baseConfigs = await loadConfig(options.config).catch((error) => {
      console.error("❌ Error loading config:", error);
      process.exit(1);
    });

    const results = await Promise.allSettled(
      baseConfigs.map(async (baseConfig) => {
        try {
          // Merge with CLI options
          const config = mergeConfig(baseConfig, {
            input: options.input,
            output: options.output,
            watch: options.watch,
            basePrefix: options.prefix,
          });

          // Generate initial routes
          await generateRoutes(config);

          // Start watch mode if requested
          if (config.watch) {
            startWatcher(config, async () => {
              await generateRoutes(config);
            });
          }
        } catch (error) {
          console.error(error);
          throw error;
        }
      }),
    );

    const hasErrors = results.some(({ status }) => status === "rejected");
    if (hasErrors) {
      process.exit(1);
    }
  });

/**
 * Init command - create example config file
 */
program
  .command("init")
  .description("Create a routes.config.ts file with defaults")
  .action(async () => {
    const configContent = `import type { RouteConfig } from "${PACKAGE_NAME}";

const config: RouteConfig = {
  input: "${DEFAULT_INPUT_DIR}",
  output: "${DEFAULT_OUTPUT_FILE}",
  watch: false,
  basePrefix: "${DEFAULT_BASE_PREFIX}",
  paramTypes: {
    // Add custom parameter types here
    // Example: userId: 'string', postId: 'number'
  },
};

export default config;
`;

    const configPath = join(process.cwd(), `${CONFIG_FILE_NAME}.ts`);

    if (existsSync(configPath)) {
      console.log(`⚠️  ${CONFIG_FILE_NAME}.ts already exists`);
      return;
    }

    await writeFile(configPath, configContent, "utf-8");
    console.log(`✅ Created ${CONFIG_FILE_NAME}.ts`);
  });

program.parse();
