import { ROUTES } from "./routes";

describe("Generated routes", () => {
  it("should have generated routes matching the typing", () => {
    expect(typeof ROUTES.hyphenedRoute).toBe("function");
    expect(ROUTES.hyphenedRoute()).toBe("/api/hyphened-route");

    expect(typeof ROUTES.collections.posts).toBe("object");
    expect(typeof ROUTES.collections.posts.$postId).toBe("function");
    expect(ROUTES.collections.posts.$postId(123)).toBe("/api/posts/123");

    expect(typeof ROUTES.collections.users).toBe("object");
    expect(typeof ROUTES.collections.users.$userId).toBe("function");
    expect(ROUTES.collections.users.$userId("user_abc")).toBe("/api/users/user_abc");
  });

  it("should not include private routes", () => {
    expect(ROUTES.hyphenedRoute).not.toHaveProperty("_private");
  });
});
