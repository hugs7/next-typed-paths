import { ROUTES } from "./routes";

describe("Generated routes", () => {
  it("should have generated routes matching the typing", () => {
    expect(typeof ROUTES.hyphenedRoute).toBe("function");
    expect(ROUTES.hyphenedRoute()).toBe("/api/hyphened-route");

    expect(typeof ROUTES.posts).toBe("object");
    expect(typeof ROUTES.posts.$postId).toBe("function");
    expect(ROUTES.posts.$postId(123)).toBe("/api/posts/123");

    expect(typeof ROUTES.users).toBe("object");
    expect(typeof ROUTES.users.$userId).toBe("function");
    expect(ROUTES.users.$userId("user_abc")).toBe("/api/users/user_abc");
  });
});
