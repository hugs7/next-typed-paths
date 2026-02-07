import type { RouteConfig } from "../src";

const config: RouteConfig = {
  input: "./test/app/api",
  output: "./test/generated/routes.ts",
  watch: false,
  basePrefix: "/api",
  paramTypeMap: {
    type: "RouteParamTypeMap",
    from: "../params",
  },
};

export default config;
