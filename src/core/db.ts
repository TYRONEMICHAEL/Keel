import { Database } from "bun:sqlite";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getKeelDir, getDecisionsPath } from "./store";
import type { Decision } from "./types";

const INDEX_FILE = "index.sqlite";

function getIndexPath(repoRoot: string = process.cwd()): string {
  return join(getKeelDir(repoRoot), INDEX_FILE);
}

function createSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      type TEXT NOT NULL,
      problem TEXT NOT NULL,
      choice TEXT NOT NULL,
      rationale TEXT,
      decided_by_role TEXT NOT NULL,
      decided_by_identifier TEXT,
      status TEXT NOT NULL,
      supersedes TEXT,
      superseded_by TEXT,
      raw_json TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS decision_files (
      decision_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      PRIMARY KEY (decision_id, file_path)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_files_path ON decision_files(file_path)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS decision_symbols (
      decision_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      PRIMARY KEY (decision_id, symbol)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_symbols_name ON decision_symbols(symbol)
  `);

  // FTS5 for full-text search
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS decisions_fts USING fts5(
      id,
      problem,
      choice,
      rationale,
      content='decisions',
      content_rowid='rowid'
    )
  `);

  // Triggers to keep FTS in sync
  db.run(`
    CREATE TRIGGER IF NOT EXISTS decisions_ai AFTER INSERT ON decisions BEGIN
      INSERT INTO decisions_fts(rowid, id, problem, choice, rationale)
      VALUES (NEW.rowid, NEW.id, NEW.problem, NEW.choice, NEW.rationale);
    END
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS decisions_ad AFTER DELETE ON decisions BEGIN
      INSERT INTO decisions_fts(decisions_fts, rowid, id, problem, choice, rationale)
      VALUES('delete', OLD.rowid, OLD.id, OLD.problem, OLD.choice, OLD.rationale);
    END
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS decisions_au AFTER UPDATE ON decisions BEGIN
      INSERT INTO decisions_fts(decisions_fts, rowid, id, problem, choice, rationale)
      VALUES('delete', OLD.rowid, OLD.id, OLD.problem, OLD.choice, OLD.rationale);
      INSERT INTO decisions_fts(rowid, id, problem, choice, rationale)
      VALUES (NEW.rowid, NEW.id, NEW.problem, NEW.choice, NEW.rationale);
    END
  `);

  // Store metadata for cache invalidation
  db.run(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

function insertDecision(db: Database, decision: Decision): void {
  // Use INSERT OR REPLACE for upsert behavior
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO decisions (
      id, created_at, type, problem, choice, rationale,
      decided_by_role, decided_by_identifier, status,
      supersedes, superseded_by, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    decision.id,
    decision.created_at,
    decision.type,
    decision.problem,
    decision.choice,
    decision.rationale ?? null,
    decision.decided_by.role,
    decision.decided_by.identifier ?? null,
    decision.status,
    decision.supersedes ?? null,
    decision.superseded_by ?? null,
    JSON.stringify(decision)
  );

  // Insert file associations
  if (decision.files?.length) {
    const fileStmt = db.prepare(`
      INSERT OR IGNORE INTO decision_files (decision_id, file_path)
      VALUES (?, ?)
    `);
    for (const file of decision.files) {
      fileStmt.run(decision.id, file);
    }
  }

  // Insert symbol associations
  if (decision.symbols?.length) {
    const symbolStmt = db.prepare(`
      INSERT OR IGNORE INTO decision_symbols (decision_id, symbol)
      VALUES (?, ?)
    `);
    for (const symbol of decision.symbols) {
      symbolStmt.run(decision.id, symbol);
    }
  }
}

function rebuildIndex(db: Database, repoRoot: string): void {
  // Clear existing data
  db.run("DELETE FROM decision_files");
  db.run("DELETE FROM decision_symbols");
  db.run("DELETE FROM decisions");

  const decisionsPath = getDecisionsPath(repoRoot);
  if (!existsSync(decisionsPath)) {
    return;
  }

  const content = readFileSync(decisionsPath, "utf-8");
  if (!content.trim()) {
    return;
  }

  const lines = content.trim().split("\n");
  const state = new Map<string, Decision>();

  for (const line of lines) {
    if (line.trim()) {
      try {
        const decision = JSON.parse(line) as Decision;
        const existing = state.get(decision.id);
        if (existing) {
          state.set(decision.id, { ...existing, ...decision });
        } else {
          state.set(decision.id, decision);
        }
      } catch {
        // Skip invalid lines
      }
    }
  }

  // Insert all decisions
  for (const decision of state.values()) {
    insertDecision(db, decision);
  }

  // Store JSONL mtime
  const stats = statSync(decisionsPath);
  const metaStmt = db.prepare(`
    INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)
  `);
  metaStmt.run("jsonl_mtime", stats.mtimeMs.toString());
}

function needsRebuild(db: Database, repoRoot: string): boolean {
  const decisionsPath = getDecisionsPath(repoRoot);

  if (!existsSync(decisionsPath)) {
    return false; // No source file, nothing to rebuild
  }

  try {
    const result = db.query("SELECT value FROM metadata WHERE key = ?").get("jsonl_mtime") as { value: string } | null;
    if (!result) {
      return true; // No mtime recorded, needs rebuild
    }

    const storedMtime = parseFloat(result.value);
    const currentMtime = statSync(decisionsPath).mtimeMs;

    return currentMtime > storedMtime;
  } catch {
    return true; // Table doesn't exist or other error
  }
}

export function openIndex(repoRoot: string = process.cwd()): Database {
  const indexPath = getIndexPath(repoRoot);
  const db = new Database(indexPath);

  createSchema(db);

  if (needsRebuild(db, repoRoot)) {
    rebuildIndex(db, repoRoot);
  }

  return db;
}

export function indexDecision(db: Database, decision: Decision): void {
  insertDecision(db, decision);

  // Update mtime
  const decisionsPath = getDecisionsPath();
  if (existsSync(decisionsPath)) {
    const stats = statSync(decisionsPath);
    const metaStmt = db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)
    `);
    metaStmt.run("jsonl_mtime", stats.mtimeMs.toString());
  }
}

export function closeIndex(db: Database): void {
  db.close();
}
