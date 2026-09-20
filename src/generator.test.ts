import { generateRouteFile } from "./generator";

describe("contract generation", () => {
  it("generates standalone Zod schemas for external output", async () => {
    const code = await generateRouteFile(
      { users: { $$route: true } },
      { contractMode: "external", input: "./app/api", output: "./generated/routes.ts" },
      [
        {
          methods: [
            {
              method: "GET",
              requestSchema: "z.strictObject({})",
              responses: [{ schema: "z.string()", status: "200" }],
            },
          ],
          segments: ["users"],
          sourcePath: "/project/app/api/users/route.ts",
        },
      ],
    );

    expect(code).toContain('import { z } from "zod"');
    expect(code).toContain("const routeContractUsersGetResponse200Schema = z.string()");
    expect(code).toContain(
      "$$contract: {\n      GET: { request: routeContractUsersGetRequestSchema, responses: { 200: routeContractUsersGetResponse200Schema } },\n    }",
    );
    expect(code).toContain("RouteBuilderObject<typeof routesStructure, {}>");
    expect(code).not.toContain("undefined as unknown as");
  });

  it("assigns imported route contracts to internal route structures", async () => {
    const code = await generateRouteFile(
      { users: { $$route: true } },
      { contractMode: "internal", input: "/project/src/app/api", output: "/project/src/generated/routes.ts" },
      [
        {
          methods: [],
          segments: ["users"],
          sourcePath: "/project/src/app/api/users/route.ts",
        },
      ],
    );

    expect(code).toContain('import { routeContract as routeContractUsers } from "../app/api/users/route"');
    expect(code).toContain("$$contract: routeContractUsers");
    expect(code).toContain("RouteBuilderObject<typeof routesStructure, {}>");
    expect(code).not.toContain("undefined as unknown as");
  });

  it("keeps contract identifiers stable when a sibling route is added", async () => {
    const config = { contractMode: "external" as const, input: "./app/api", output: "./generated/routes.ts" };
    const usersContract = {
      methods: [
        {
          method: "GET",
          requestSchema: "z.strictObject({})",
          responses: [{ schema: "z.string()", status: "200" }],
        },
      ],
      segments: ["users"],
      sourcePath: "/project/app/api/users/route.ts",
    };
    const postsContract = { ...usersContract, segments: ["posts"], sourcePath: "/project/app/api/posts/route.ts" };

    const before = await generateRouteFile({ users: { $$route: true } }, config, [usersContract]);
    const after = await generateRouteFile({ users: { $$route: true }, posts: { $$route: true } }, config, [
      postsContract,
      usersContract,
    ]);

    for (const name of ["routeContractUsersGetRequestSchema", "routeContractUsersGetResponse200Schema"]) {
      expect(before).toContain(name);
      expect(after).toContain(name);
    }
  });

  it("disambiguates contracts whose normalized segments collide", async () => {
    const code = await generateRouteFile(
      { users: { $$route: true } },
      { contractMode: "internal", input: "./app/api", output: "./generated/routes.ts" },
      [
        { methods: [], segments: ["users", "$userId"], sourcePath: "/project/app/api/users/[userId]/route.ts" },
        { methods: [], segments: ["users", "userId"], sourcePath: "/project/app/api/users/userId/route.ts" },
      ],
    );

    expect(code).toContain(
      'import { routeContract as routeContractUsersUserId } from "../../../../../../project/app/api/users/[userId]/route"',
    );
    expect(code).toMatch(
      /import \{ routeContract as routeContractUsersUserId[0-9a-f]{6} \} from "[./]*project\/app\/api\/users\/userId\/route"/,
    );
  });

  it("omits route contracts from path-only output", async () => {
    const code = await generateRouteFile(
      {},
      { contracts: false, input: "./app/api", output: "./generated/routes.ts" },
      [
        {
          methods: [],
          segments: ["users"],
          sourcePath: "/project/app/api/users/route.ts",
        },
      ],
    );

    expect(code).not.toContain("/app/api/users/route");
  });
});
