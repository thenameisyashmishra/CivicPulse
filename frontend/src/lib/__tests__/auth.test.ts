import { describe, it, expect, beforeEach } from "vitest";
import { saveToken, getToken, clearToken, isLoggedIn, authHeader, saveUser, getUser } from "../auth";

describe("auth helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("handles user login state accurately", () => {
    expect(isLoggedIn()).toBe(false);
    expect(authHeader()).toEqual({});

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const validJwt = `header.${btoa(JSON.stringify({ exp: futureExp }))}.sig`;
    saveToken(validJwt);

    expect(isLoggedIn()).toBe(true);
    expect(getToken()).toBe(validJwt);
    expect(authHeader()).toEqual({ Authorization: `Bearer ${validJwt}` });

    clearToken();
    expect(isLoggedIn()).toBe(false);
    expect(authHeader()).toEqual({});
  });

  it("saves and retrieves user profile from storage", () => {
    const user = { id: 1, name: "Dr. Ananya Sharma", role: "engineer" };
    saveUser(user);
    expect(getUser()).toEqual(user);
  });
});
