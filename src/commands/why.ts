import { Command } from "commander";
import { openIndex, closeIndex } from "../core/db";
import { queryById } from "../core/query";
import { normalizeDecisionId } from "../core/id";
import { formatDecisionFull, formatJson } from "../utils/format";

interface WhyOptions {
  json?: boolean;
}

export const whyCommand = new Command("why")
  .description("Show full details of a decision")
  .argument("<id>", "Decision ID (e.g., DEC-a1b2 or just a1b2)")
  .option("--json", "Output as JSON")
  .action(async (rawId: string, options: WhyOptions) => {
    try {
      const id = normalizeDecisionId(rawId);
      const db = openIndex();

      const decision = queryById(db, id);
      closeIndex(db);

      if (!decision) {
        console.error(`Decision ${id} not found`);
        process.exit(1);
      }

      if (options.json) {
        console.log(formatJson(decision));
      } else {
        console.log(formatDecisionFull(decision));
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
