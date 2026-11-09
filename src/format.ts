import { createRequire } from "module";
import prettier, { type Options } from "prettier";
import { Worker } from "worker_threads";

const WORKER_SOURCE = `
const { parentPort, workerData } = require("worker_threads");
require(workerData.prettierPath)
  .format(workerData.code, workerData.options)
  .then((code) => parentPort.postMessage(code));
`;

/**
 * Formats code with prettier on a worker thread, so outputs of concurrently generated configs format in parallel.
 * Falls back to formatting on the current thread when the options cannot be sent to a worker.
 *
 * @param code - Code to format
 * @param options - Prettier options
 * @returns The formatted code
 */
export const formatCode = (code: string, options: Options): Promise<string> => {
  let worker: Worker;
  try {
    const prettierPath = createRequire(import.meta.url).resolve("prettier");
    worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { code, options, prettierPath } });
  } catch {
    return prettier.format(code, options);
  }

  return new Promise((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
  });
};
