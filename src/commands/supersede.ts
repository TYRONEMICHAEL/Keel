import { Command } from "commander";
import type { Decision, DecisionType } from "../core/types";
import { appendDecision } from "../core/store";
import { generateDecisionId, normalizeDecisionId } from "../core/id";
import { openIndex, indexDecision, closeIndex } from "../core/db";
import { queryById } from "../core/query";
import { getGitIdentifier } from "../utils/git";
import { formatDecisionId } from "../utils/format";

interface SupersedeOptions {
  problem: string;
  choice: string;
  type?: DecisionType;
  rationale?: string;
  tradeoffs?: string;
  files?: string;
  symbols?: string;
  agent?: boolean;
  identifier?: string;
  json?: boolean;
}

export const supersedeCommand = new Command("supersede")
  .description("Supersede an existing decision with a new one")
  .argument("<id>", "ID of the decision to supersede (e.g., DEC-a1b2 or just a1b2)")
  .requiredOption("-p, --problem <problem>", "The new problem statement")
  .requiredOption("-c, --choice <choice>", "The new choice")
  .option("-t, --type <type>", "Decision type (defaults to original)")
  .option("-r, --rationale <rationale>", "Why this change was made")
  .option("--tradeoffs <tradeoffs>", "Comma-separated list of tradeoffs")
  .option("-f, --files <files>", "Comma-separated file paths (defaults to original)")
  .option("-s, --symbols <symbols>", "Comma-separated symbol names (defaults to original)")
  .option("--agent", "Mark this decision as made by an agent")
  .option("--identifier <identifier>", "Identifier for who made the decision")
  .option("--json", "Output as JSON")
  .action(async (rawOldId: string, options: SupersedeOptions) => {
    try {
      const oldId = normalizeDecisionId(rawOldId);
      const db = openIndex();

      // Find the old decision
      const oldDecision = queryById(db, oldId);
      if (!oldDecision) {
        console.error(`Decision ${oldId} not found`);
        process.exit(1);
      }

      if (oldDecision.status === "superseded") {
        console.error(`Decision ${oldId} is already superseded by ${oldDecision.superseded_by}`);
        process.exit(1);
      }

      // Parse comma-separated values
      const files = options.files?.split(",").map((f) => f.trim()).filter(Boolean) ?? oldDecision.files;
      const symbols = options.symbols?.split(",").map((s) => s.trim()).filter(Boolean) ?? oldDecision.symbols;
      const tradeoffs = options.tradeoffs?.split(",").map((t) => t.trim()).filter(Boolean);

      // Determine who made the decision
      const role = options.agent ? "agent" : "human";
      const identifier = options.identifier ?? (role === "human" ? getGitIdentifier() : undefined);

      // Generate hash-based ID (collision-resistant for multi-agent workflows)
      const newId = generateDecisionId(options.problem, options.choice);

      // Create new decision
      const newDecision: Decision = {
        id: newId,
        created_at: new Date().toISOString(),
        type: (options.type as DecisionType) ?? oldDecision.type,
        problem: options.problem,
        choice: options.choice,
        rationale: options.rationale,
        tradeoffs,
        decided_by: { role, identifier },
        files,
        symbols,
        status: "active",
        supersedes: oldId,
      };

      // Append new decision
      await appendDecision(newDecision);
      indexDecision(db, newDecision);

      // Mark old decision as superseded
      const updateEntry: Partial<Decision> & { id: string } = {
        id: oldId,
        status: "superseded",
        superseded_by: newId,
      };
      await appendDecision(updateEntry as Decision);

      // Update index with superseded status
      const updatedOld: Decision = {
        ...oldDecision,
        status: "superseded",
        superseded_by: newId,
      };
      indexDecision(db, updatedOld);

      closeIndex(db);

      if (options.json) {
        console.log(JSON.stringify({ superseded: oldId, created: newDecision }, null, 2));
      } else {
        console.log(`Superseded ${formatDecisionId(oldId)} with ${formatDecisionId(newId)}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error("An unexpected error occurred");
      }
      process.exit(1);
    }
  });
