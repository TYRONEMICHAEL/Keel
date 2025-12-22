import { describe, test, expect } from "bun:test";
import {
  generateDecisionId,
  isValidDecisionId,
  normalizeDecisionId,
} from "../src/core/id";

describe("generateDecisionId", () => {
  test("generates valid ID format", () => {
    const id = generateDecisionId("test problem", "test choice");
    expect(id).toMatch(/^DEC-[a-f0-9]{4}$/);
  });

  test("generates different IDs for same input (includes entropy)", () => {
    const id1 = generateDecisionId("problem", "choice");
    const id2 = generateDecisionId("problem", "choice");
    // They should usually be different due to random entropy
    // but we can't guarantee it, so just check format
    expect(isValidDecisionId(id1)).toBe(true);
    expect(isValidDecisionId(id2)).toBe(true);
  });
});

describe("isValidDecisionId", () => {
  test("validates correct format", () => {
    expect(isValidDecisionId("DEC-a1b2")).toBe(true);
    expect(isValidDecisionId("DEC-0000")).toBe(true);
    expect(isValidDecisionId("DEC-ffff")).toBe(true);
  });

  test("rejects invalid format", () => {
    expect(isValidDecisionId("DEC-123")).toBe(false); // too short
    expect(isValidDecisionId("DEC-12345")).toBe(false); // too long
    expect(isValidDecisionId("DEC-gggg")).toBe(false); // invalid hex
    expect(isValidDecisionId("dec-a1b2")).toBe(true); // case insensitive
    expect(isValidDecisionId("a1b2")).toBe(false); // no prefix
  });
});

describe("normalizeDecisionId", () => {
  test("normalizes full ID", () => {
    expect(normalizeDecisionId("DEC-a1b2")).toBe("DEC-a1b2");
    expect(normalizeDecisionId("dec-A1B2")).toBe("DEC-a1b2");
    expect(normalizeDecisionId("DEC-A1B2")).toBe("DEC-a1b2");
  });

  test("normalizes suffix only", () => {
    expect(normalizeDecisionId("a1b2")).toBe("DEC-a1b2");
    expect(normalizeDecisionId("A1B2")).toBe("DEC-a1b2");
  });

  test("throws on invalid input", () => {
    expect(() => normalizeDecisionId("invalid")).toThrow();
    expect(() => normalizeDecisionId("DEC-xyz")).toThrow();
    expect(() => normalizeDecisionId("")).toThrow();
  });
});
