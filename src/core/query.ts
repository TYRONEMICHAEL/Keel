import type { Database } from "bun:sqlite";
import type { Decision, DecisionType, DecisionStatus } from "./types";

interface DecisionRow {
  id: string;
  created_at: string;
  type: string;
  problem: string;
  choice: string;
  rationale: string | null;
  decided_by_role: string;
  decided_by_identifier: string | null;
  status: string;
  supersedes: string | null;
  superseded_by: string | null;
  raw_json: string;
}

function rowToDecision(row: DecisionRow): Decision {
  return JSON.parse(row.raw_json) as Decision;
}

export function queryById(db: Database, id: string): Decision | null {
  const row = db.query<DecisionRow, [string]>(
    "SELECT * FROM decisions WHERE id = ?"
  ).get(id);

  return row ? rowToDecision(row) : null;
}

export function queryByFile(db: Database, filePath: string): Decision[] {
  // Support glob patterns with LIKE
  const pattern = filePath.includes("*")
    ? filePath.replace(/\*/g, "%")
    : filePath;

  const rows = db.query<DecisionRow, [string]>(`
    SELECT d.* FROM decisions d
    INNER JOIN decision_files df ON d.id = df.decision_id
    WHERE df.file_path LIKE ?
    AND d.status = 'active'
    ORDER BY d.created_at DESC
  `).all(pattern);

  return rows.map(rowToDecision);
}

export function queryBySymbol(db: Database, symbol: string): Decision[] {
  const rows = db.query<DecisionRow, [string]>(`
    SELECT d.* FROM decisions d
    INNER JOIN decision_symbols ds ON d.id = ds.decision_id
    WHERE ds.symbol = ?
    AND d.status = 'active'
    ORDER BY d.created_at DESC
  `).all(symbol);

  return rows.map(rowToDecision);
}

export function queryByBead(db: Database, beadId: string): Decision[] {
  const rows = db.query<DecisionRow, [string]>(`
    SELECT d.* FROM decisions d
    INNER JOIN decision_beads db ON d.id = db.decision_id
    WHERE db.bead_id = ?
    AND d.status = 'active'
    ORDER BY d.created_at DESC
  `).all(beadId);

  return rows.map(rowToDecision);
}

export interface QueryOptions {
  type?: DecisionType;
  status?: DecisionStatus;
  limit?: number;
}

export function queryAll(db: Database, options: QueryOptions = {}): Decision[] {
  let sql = "SELECT * FROM decisions WHERE 1=1";
  const params: string[] = [];

  if (options.type) {
    sql += " AND type = ?";
    params.push(options.type);
  }

  if (options.status) {
    sql += " AND status = ?";
    params.push(options.status);
  }

  sql += " ORDER BY created_at DESC";

  if (options.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  const stmt = db.query<DecisionRow, string[]>(sql);
  const rows = stmt.all(...params);

  return rows.map(rowToDecision);
}

export function searchFullText(
  db: Database,
  query: string,
  options: QueryOptions = {}
): Decision[] {
  // Use FTS5 for full-text search
  let sql = `
    SELECT d.* FROM decisions d
    INNER JOIN decisions_fts fts ON d.id = fts.id
    WHERE decisions_fts MATCH ?
  `;
  const params: string[] = [query];

  if (options.type) {
    sql += " AND d.type = ?";
    params.push(options.type);
  }

  if (options.status) {
    sql += " AND d.status = ?";
    params.push(options.status);
  }

  sql += " ORDER BY rank";

  if (options.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  try {
    const stmt = db.query<DecisionRow, string[]>(sql);
    const rows = stmt.all(...params);
    return rows.map(rowToDecision);
  } catch (e) {
    // FTS query might fail on invalid syntax, fall back to LIKE search
    return searchLike(db, query, options);
  }
}

function searchLike(
  db: Database,
  query: string,
  options: QueryOptions = {}
): Decision[] {
  const pattern = `%${query}%`;

  let sql = `
    SELECT * FROM decisions
    WHERE (problem LIKE ? OR choice LIKE ? OR rationale LIKE ?)
  `;
  const params: string[] = [pattern, pattern, pattern];

  if (options.type) {
    sql += " AND type = ?";
    params.push(options.type);
  }

  if (options.status) {
    sql += " AND status = ?";
    params.push(options.status);
  }

  sql += " ORDER BY created_at DESC";

  if (options.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  const stmt = db.query<DecisionRow, string[]>(sql);
  const rows = stmt.all(...params);

  return rows.map(rowToDecision);
}

export function getActiveConstraints(db: Database): Decision[] {
  const rows = db.query<DecisionRow, []>(`
    SELECT * FROM decisions
    WHERE type = 'constraint' AND status = 'active'
    ORDER BY created_at DESC
  `).all();

  return rows.map(rowToDecision);
}

export function getDecisionsForContext(
  db: Database,
  path: string
): { decisions: Decision[]; constraints: Decision[] } {
  const decisions = queryByFile(db, path);
  const constraints = getActiveConstraints(db);

  return { decisions, constraints };
}
