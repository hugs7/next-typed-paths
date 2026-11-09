import { resolve } from "path";

import { resolveRouteContractsSchemas } from "./contractType";

describe("resolveRouteContractsSchemas", () => {
  it("resolves multiple route contracts in one compiler helper without mixing their schemas", () => {
    const [userContract, portableContract] = resolveRouteContractsSchemas(
      [resolve("test/app/api/(collections)/users/[userId]/route.ts"), resolve("test/app/api/portable/route.ts")],
      resolve("tsconfig.spec.json"),
    );

    expect(userContract?.methods.map(({ method }) => method)).toEqual(["GET", "POST"]);
    expect(userContract?.methods[0]?.requestSchema).toContain('userId: z.literal("contract_user")');
    expect(portableContract?.methods.map(({ method }) => method)).toEqual(["GET"]);
    expect(portableContract?.methods[0]?.responses[0]?.schema).toContain("portable: z.literal(true)");
  });
});
