import type { Decision } from "../core/types";

// ANSI color codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";

const TYPE_COLORS: Record<string, string> = {
  product: BLUE,
  process: MAGENTA,
  constraint: RED,
  learning: CYAN,
};

const STATUS_COLORS: Record<string, string> = {
  active: GREEN,
  superseded: DIM,
};

export function formatDecisionId(id: string): string {
  return `${BOLD}${id}${RESET}`;
}

export function formatType(type: string): string {
  const color = TYPE_COLORS[type] ?? "";
  return `${color}${type}${RESET}`;
}

export function formatStatus(status: string): string {
  const color = STATUS_COLORS[status] ?? "";
  return `${color}${status}${RESET}`;
}

export function formatDecisionSummary(decision: Decision): string {
  const lines: string[] = [];

  lines.push(
    `${formatDecisionId(decision.id)} [${formatType(decision.type)}] ${formatStatus(decision.status)}`
  );
  lines.push(`  ${DIM}Problem:${RESET} ${decision.problem}`);
  lines.push(`  ${DIM}Choice:${RESET} ${decision.choice}`);

  return lines.join("\n");
}

export function formatDecisionFull(decision: Decision): string {
  const lines: string[] = [];

  lines.push(`${BOLD}Decision ${decision.id}${RESET}`);
  lines.push("");
  lines.push(`${DIM}Type:${RESET}     ${formatType(decision.type)}`);
  lines.push(`${DIM}Status:${RESET}   ${formatStatus(decision.status)}`);
  lines.push(`${DIM}Created:${RESET}  ${decision.created_at}`);
  lines.push("");
  lines.push(`${BOLD}Problem${RESET}`);
  lines.push(decision.problem);
  lines.push("");
  lines.push(`${BOLD}Choice${RESET}`);
  lines.push(decision.choice);

  if (decision.rationale) {
    lines.push("");
    lines.push(`${BOLD}Rationale${RESET}`);
    lines.push(decision.rationale);
  }

  if (decision.tradeoffs?.length) {
    lines.push("");
    lines.push(`${BOLD}Tradeoffs${RESET}`);
    for (const tradeoff of decision.tradeoffs) {
      lines.push(`  - ${tradeoff}`);
    }
  }

  if (decision.files?.length) {
    lines.push("");
    lines.push(`${BOLD}Files${RESET}`);
    for (const file of decision.files) {
      lines.push(`  ${file}`);
    }
  }

  if (decision.symbols?.length) {
    lines.push("");
    lines.push(`${BOLD}Symbols${RESET}`);
    for (const symbol of decision.symbols) {
      lines.push(`  ${symbol}`);
    }
  }

  lines.push("");
  lines.push(
    `${DIM}Decided by:${RESET} ${decision.decided_by.role}${decision.decided_by.identifier ? ` (${decision.decided_by.identifier})` : ""}`
  );

  if (decision.supersedes) {
    lines.push(`${DIM}Supersedes:${RESET} ${decision.supersedes}`);
  }

  if (decision.superseded_by) {
    lines.push(`${DIM}Superseded by:${RESET} ${decision.superseded_by}`);
  }

  if (decision.hypothesis) {
    lines.push("");
    lines.push(`${BOLD}Hypothesis${RESET}`);
    lines.push(decision.hypothesis);
  }

  if (decision.success_criteria) {
    lines.push("");
    lines.push(`${BOLD}Success Criteria${RESET}`);
    lines.push(decision.success_criteria);
  }

  return lines.join("\n");
}

export function formatDecisionList(decisions: Decision[]): string {
  if (decisions.length === 0) {
    return `${DIM}No decisions found.${RESET}`;
  }

  return decisions.map(formatDecisionSummary).join("\n\n");
}

export function formatContextResult(result: {
  decisions: Decision[];
  constraints: Decision[];
}): string {
  const lines: string[] = [];

  if (result.decisions.length > 0) {
    lines.push(`${BOLD}Decisions affecting this file:${RESET}`);
    lines.push("");
    lines.push(formatDecisionList(result.decisions));
  } else {
    lines.push(`${DIM}No decisions directly affect this file.${RESET}`);
  }

  if (result.constraints.length > 0) {
    lines.push("");
    lines.push(`${BOLD}Active constraints:${RESET}`);
    lines.push("");
    for (const constraint of result.constraints) {
      lines.push(`  ${formatDecisionId(constraint.id)} ${constraint.choice}`);
    }
  }

  return lines.join("\n");
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
