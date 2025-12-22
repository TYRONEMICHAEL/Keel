import { mkdir, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Decision } from "./types";

const KEEL_DIR = ".keel";
const DECISIONS_FILE = "decisions.jsonl";

export function getKeelDir(repoRoot: string = process.cwd()): string {
  return join(repoRoot, KEEL_DIR);
}

export function getDecisionsPath(repoRoot: string = process.cwd()): string {
  return join(getKeelDir(repoRoot), DECISIONS_FILE);
}

export async function ensureKeelDir(repoRoot: string = process.cwd()): Promise<void> {
  const keelDir = getKeelDir(repoRoot);
  if (!existsSync(keelDir)) {
    await mkdir(keelDir, { recursive: true });
  }
}

export async function appendDecision(
  decision: Decision,
  repoRoot: string = process.cwd()
): Promise<void> {
  await ensureKeelDir(repoRoot);
  const path = getDecisionsPath(repoRoot);
  const line = JSON.stringify(decision) + "\n";
  await appendFile(path, line, "utf-8");
}

export async function readAllDecisions(
  repoRoot: string = process.cwd()
): Promise<Decision[]> {
  const path = getDecisionsPath(repoRoot);

  if (!existsSync(path)) {
    return [];
  }

  const file = Bun.file(path);
  const content = await file.text();

  if (!content.trim()) {
    return [];
  }

  const lines = content.trim().split("\n");
  const decisions: Decision[] = [];

  for (const line of lines) {
    if (line.trim()) {
      try {
        decisions.push(JSON.parse(line));
      } catch (e) {
        console.error(`Warning: Failed to parse line: ${line}`);
      }
    }
  }

  return decisions;
}

export async function getLatestState(
  repoRoot: string = process.cwd()
): Promise<Map<string, Decision>> {
  const decisions = await readAllDecisions(repoRoot);
  const state = new Map<string, Decision>();

  for (const decision of decisions) {
    const existing = state.get(decision.id);
    if (existing) {
      state.set(decision.id, { ...existing, ...decision });
    } else {
      state.set(decision.id, decision);
    }
  }

  return state;
}

export async function getDecisionById(
  id: string,
  repoRoot: string = process.cwd()
): Promise<Decision | null> {
  const state = await getLatestState(repoRoot);
  return state.get(id) ?? null;
}

export async function getActiveDecisions(
  repoRoot: string = process.cwd()
): Promise<Decision[]> {
  const state = await getLatestState(repoRoot);
  return Array.from(state.values()).filter((d) => d.status === "active");
}
