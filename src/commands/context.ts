import { Command } from "commander";
import { openIndex, closeIndex } from "../core/db";
import { getDecisionsForContext, queryBySymbol } from "../core/query";
import { formatContextResult, formatJson } from "../utils/format";

interface ContextOptions {
  json?: boolean;
}

export const contextCommand = new Command("context")
  .description("Get decisions affecting a file or symbol")
  .argument("<path>", "File path or symbol name")
  .option("--json", "Output as JSON")
  .action(async (path: string, options: ContextOptions) => {
    try {
      const db = openIndex();

      // Try as file path first, then as symbol
      const result = getDecisionsForContext(db, path);

      // If no file decisions, try symbol lookup
      if (result.decisions.length === 0) {
        const symbolDecisions = queryBySymbol(db, path);
        if (symbolDecisions.length > 0) {
          result.decisions = symbolDecisions;
        }
      }

      closeIndex(db);

      if (options.json) {
        console.log(formatJson(result));
      } else {
        console.log(formatContextResult(result));
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
