import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendDecision,
  readAllDecisions,
  getLatestState,
  getDecisionById,
  getActiveDecisions,
} from "../src/core/store";
import type { Decision } from "../src/core/types";

describe("store", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "keel-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const createTestDecision = (id: string, overrides: Partial<Decision> = {}): Decision => ({
    id,
    created_at: new Date().toISOString(),
    type: "product",
    problem: "test problem",
    choice: "test choice",
    decided_by: { role: "human" },
    status: "active",
    ...overrides,
  });

  test("appendDecision creates .keel directory and file", async () => {
    const decision = createTestDecision("DEC-0001");
    await appendDecision(decision, testDir);

    const decisions = await readAllDecisions(testDir);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].id).toBe("DEC-0001");
  });

  test("appendDecision appends multiple decisions", async () => {
    await appendDecision(createTestDecision("DEC-0001"), testDir);
    await appendDecision(createTestDecision("DEC-0002"), testDir);
    await appendDecision(createTestDecision("DEC-0003"), testDir);

    const decisions = await readAllDecisions(testDir);
    expect(decisions).toHaveLength(3);
  });

  test("getLatestState merges updates to same ID", async () => {
    // First version
    await appendDecision(
      createTestDecision("DEC-0001", { status: "active" }),
      testDir
    );
    // Update
    await appendDecision(
      createTestDecision("DEC-0001", { status: "superseded", superseded_by: "DEC-0002" }),
      testDir
    );

    const state = await getLatestState(testDir);
    expect(state.size).toBe(1);

    const decision = state.get("DEC-0001");
    expect(decision?.status).toBe("superseded");
    expect(decision?.superseded_by).toBe("DEC-0002");
  });

  test("getDecisionById returns null for non-existent ID", async () => {
    const decision = await getDecisionById("DEC-9999", testDir);
    expect(decision).toBeNull();
  });

  test("getActiveDecisions filters superseded", async () => {
    await appendDecision(
      createTestDecision("DEC-0001", { status: "superseded" }),
      testDir
    );
    await appendDecision(
      createTestDecision("DEC-0002", { status: "active" }),
      testDir
    );

    const active = await getActiveDecisions(testDir);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("DEC-0002");
  });
});
