import { describe, it, expect, beforeEach } from "vitest";
import { formatCurrency, isTokenExpired, getToken, setToken, clearToken } from "../data";

describe("data layer utility functions", () => {
  describe("formatCurrency", () => {
    it("formats amounts in Crores (>= 10,000,000)", () => {
      expect(formatCurrency(15000000)).toBe("₹1.5 Cr");
      expect(formatCurrency(100000000)).toBe("₹10.0 Cr");
    });

    it("formats amounts in Lakhs (>= 100,000 and < 10,000,000)", () => {
      expect(formatCurrency(250000)).toBe("₹2.5 L");
      expect(formatCurrency(9900000)).toBe("₹99.0 L");
    });

    it("formats smaller amounts with standard Indian locale formatting", () => {
      const formatted = formatCurrency(50000);
      expect(formatted).toContain("50,000");
      expect(formatted.startsWith("₹")).toBe(true);
    });
  });

  describe("isTokenExpired", () => {
    it("returns false for non-JWT strings safely", () => {
      expect(isTokenExpired("not-a-token")).toBe(false);
      expect(isTokenExpired("part1.part2")).toBe(false);
    });

    it("detects expired tokens correctly", () => {
      // Past expiration (exp = 1000)
      const pastExp = 1000;
      const payload = btoa(JSON.stringify({ exp: pastExp }));
      const expiredJwt = `header.${payload}.signature`;
      expect(isTokenExpired(expiredJwt)).toBe(true);
    });

    it("detects active tokens correctly", () => {
      // Future expiration (1 hour ahead)
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp }));
      const activeJwt = `header.${payload}.signature`;
      expect(isTokenExpired(activeJwt)).toBe(false);
    });
  });

  describe("token storage operations", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("stores and clears tokens in localStorage", () => {
      expect(getToken()).toBeNull();
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const validJwt = `header.${btoa(JSON.stringify({ exp: futureExp }))}.sig`;
      setToken(validJwt);
      expect(getToken()).toBe(validJwt);
      clearToken();
      expect(getToken()).toBeNull();
    });
  });
});
