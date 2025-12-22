import { z } from "zod";

export const DecisionType = z.enum(["product", "process", "constraint", "learning"]);
export type DecisionType = z.infer<typeof DecisionType>;

export const DecisionStatus = z.enum(["active", "superseded"]);
export type DecisionStatus = z.infer<typeof DecisionStatus>;

export const DecidedBy = z.object({
  role: z.enum(["human", "agent"]),
  identifier: z.string().optional(),
});
export type DecidedBy = z.infer<typeof DecidedBy>;

export const DecisionSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  type: DecisionType,
  problem: z.string().min(1),
  choice: z.string().min(1),
  rationale: z.string().optional(),
  tradeoffs: z.array(z.string()).optional(),
  decided_by: DecidedBy,
  files: z.array(z.string()).optional(),
  symbols: z.array(z.string()).optional(),
  beads: z.array(z.string()).optional(),
  status: DecisionStatus,
  superseded_by: z.string().optional(),
  supersedes: z.string().optional(),
  hypothesis: z.string().optional(),
  success_criteria: z.string().optional(),
});

export type Decision = z.infer<typeof DecisionSchema>;

export const DecisionInputSchema = z.object({
  type: DecisionType,
  problem: z.string().min(1),
  choice: z.string().min(1),
  rationale: z.string().optional(),
  tradeoffs: z.array(z.string()).optional(),
  decided_by: DecidedBy.optional(),
  files: z.array(z.string()).optional(),
  symbols: z.array(z.string()).optional(),
  beads: z.array(z.string()).optional(),
  hypothesis: z.string().optional(),
  success_criteria: z.string().optional(),
  supersedes: z.string().optional(),
});

export type DecisionInput = z.infer<typeof DecisionInputSchema>;

export function validateDecision(data: unknown): Decision {
  return DecisionSchema.parse(data);
}

export function validateDecisionInput(data: unknown): DecisionInput {
  return DecisionInputSchema.parse(data);
}
