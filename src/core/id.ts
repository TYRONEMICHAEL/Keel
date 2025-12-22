const ID_PREFIX = "DEC";

/**
 * Generate a hash-based decision ID.
 * Uses content hashing to prevent collisions in multi-agent workflows.
 * Format: DEC-xxxx (4 hex characters from content hash + entropy)
 */
export function generateDecisionId(problem: string, choice: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  const content = `${problem}:${choice}:${timestamp}:${random}`;

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
  }

  // Convert to 4-character hex suffix
  const suffix = Math.abs(hash).toString(16).substring(0, 4).padStart(4, "0");
  return `${ID_PREFIX}-${suffix}`;
}

/**
 * Check if a string is a valid decision ID format.
 */
export function isValidDecisionId(id: string): boolean {
  return /^DEC-[a-f0-9]{4}$/i.test(id);
}

/**
 * Normalize a decision ID input.
 * Accepts: "DEC-a1b2", "dec-a1b2", "a1b2"
 * Always returns lowercase suffix for consistency.
 */
export function normalizeDecisionId(input: string): string {
  const trimmed = input.trim();

  if (trimmed.toUpperCase().startsWith("DEC-")) {
    const suffix = trimmed.slice(4).toLowerCase();
    if (!/^[a-f0-9]{4}$/.test(suffix)) {
      throw new Error(`Invalid decision ID: ${input}. Expected format: DEC-xxxx (4 hex chars)`);
    }
    return `DEC-${suffix}`;
  }

  // Assume it's just the suffix
  if (/^[A-F0-9]{4}$/i.test(trimmed)) {
    return `DEC-${trimmed.toLowerCase()}`;
  }

  throw new Error(`Invalid decision ID: ${input}. Expected format: DEC-xxxx (4 hex chars)`);
}
