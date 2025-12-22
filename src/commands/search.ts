import { Command } from "commander";
import { openIndex, closeIndex } from "../core/db";
import { searchFullText, queryAll } from "../core/query";
import type { DecisionType, DecisionStatus } from "../core/types";
import { formatDecisionList, formatJson } from "../utils/format";

interface SearchOptions {
  type?: DecisionType;
  status?: DecisionStatus;
  limit?: string;
  json?: boolean;
}

export const searchCommand = new Command("search")
  .description("Search decisions by text, type, or status")
  .argument("[query]", "Search query (searches problem, choice, rationale)")
  .option("-t, --type <type>", "Filter by type: product, process, constraint, learning")
  .option("--status <status>", "Filter by status: active, superseded")
  .option("-l, --limit <limit>", "Maximum number of results")
  .option("--json", "Output as JSON")
  .action(async (query: string | undefined, options: SearchOptions) => {
    try {
      const db = openIndex();

      const queryOptions = {
        type: options.type as DecisionType | undefined,
        status: options.status as DecisionStatus | undefined,
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
      };

      let decisions;
      if (query) {
        decisions = searchFullText(db, query, queryOptions);
      } else {
        decisions = queryAll(db, queryOptions);
      }

      closeIndex(db);

      if (options.json) {
        console.log(formatJson(decisions));
      } else {
        console.log(formatDecisionList(decisions));
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
