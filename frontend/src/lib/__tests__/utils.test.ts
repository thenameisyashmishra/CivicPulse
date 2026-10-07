import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("merges class names correctly", () => {
    expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
  });

  it("handles conditional classes properly", () => {
    const isHidden = false;
    const isFeatured = true;
    expect(cn("base-class", isHidden && "hidden", isFeatured && "featured")).toBe(
      "base-class featured"
    );
  });

  it("resolves Tailwind conflicting classes using twMerge", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles empty and falsy values without crashing", () => {
    expect(cn("", null, undefined, false, "valid")).toBe("valid");
  });
});
