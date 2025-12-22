import { Command } from "commander";
import type { Decision, DecisionInput, DecisionType } from "../core/types";
import { validateDecisionInput } from "../core/types";
import { appendDecision, ensureKeelDir } from "../core/store";
import { generateDecisionId } from "../core/id";
import { openIndex, indexDecision, closeIndex } from "../core/db";
import { getGitIdentifier } from "../utils/git";
import { formatDecisionId } from "../utils/format";

interface DecideOptions {
  type: DecisionType;
  problem: string;
  choice: string;
  rationale?: string;
  tradeoffs?: string;
  files?: string;
  symbols?: string;
  agent?: boolean;
  identifier?: string;
  hypothesis?: string;
  successCriteria?: string;
  json?: boolean;
}

export const decideCommand = new Command("decide")
  .description("Record a new decision")
  .requiredOption("-t, --type <type>", "Decision type: product, process, constraint, or learning")
  .requiredOption("-p, --problem <problem>", "The problem this decision addresses")
  .requiredOption("-c, --choice <choice>", "What was decided")
  .option("-r, --rationale <rationale>", "Why this choice was made")
  .option("--tradeoffs <tradeoffs>", "Comma-separated list of tradeoffs")
  .option("-f, --files <files>", "Comma-separated file paths this decision affects")
  .option("-s, --symbols <symbols>", "Comma-separated symbol names")
  .option("--agent", "Mark this decision as made by an agent")
  .option("--identifier <identifier>", "Identifier for who made the decision")
  .option("--hypothesis <hypothesis>", "Hypothesis being tested (for learnings)")
  .option("--success-criteria <criteria>", "How to measure success")
  .option("--json", "Output as JSON")
  .action(async (options: DecideOptions) => {
    try {
      // Parse comma-separated values
      const files = options.files?.split(",").map((f) => f.trim()).filter(Boolean);
      const symbols = options.symbols?.split(",").map((s) => s.trim()).filter(Boolean);
      const tradeoffs = options.tradeoffs?.split(",").map((t) => t.trim()).filter(Boolean);

      // Determine who made the decision
      const role = options.agent ? "agent" : "human";
      const identifier = options.identifier ?? (role === "human" ? getGitIdentifier() : undefined);

      // Validate input
      const input: DecisionInput = validateDecisionInput({
        type: options.type,
        problem: options.problem,
        choice: options.choice,
        rationale: options.rationale,
        tradeoffs,
        files,
        symbols,
        hypothesis: options.hypothesis,
        success_criteria: options.successCriteria,
        decided_by: { role, identifier },
      });

      // Generate hash-based ID (collision-resistant for multi-agent workflows)
      const id = generateDecisionId(input.problem, input.choice);

      // Create full decision
      const decision: Decision = {
        id,
        created_at: new Date().toISOString(),
        type: input.type,
        problem: input.problem,
        choice: input.choice,
        rationale: input.rationale,
        tradeoffs: input.tradeoffs,
        decided_by: input.decided_by ?? { role: "human" },
        files: input.files,
        symbols: input.symbols,
        status: "active",
        hypothesis: input.hypothesis,
        success_criteria: input.success_criteria,
        supersedes: input.supersedes,
      };

      // Append to JSONL
      await ensureKeelDir();
      await appendDecision(decision);

      // Update SQLite index
      const db = openIndex();
      indexDecision(db, decision);
      closeIndex(db);

      if (options.json) {
        console.log(JSON.stringify(decision, null, 2));
      } else {
        console.log(`Created ${formatDecisionId(id)}`);
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
