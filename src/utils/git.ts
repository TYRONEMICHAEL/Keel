import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

export function findRepoRoot(startDir: string = process.cwd()): string | null {
  let current = startDir;

  while (current !== "/") {
    if (existsSync(join(current, ".git"))) {
      return current;
    }
    current = dirname(current);
  }

  return null;
}

export function getGitUser(): { name: string; email: string } | null {
  try {
    const nameResult = Bun.spawnSync(["git", "config", "user.name"]);
    const emailResult = Bun.spawnSync(["git", "config", "user.email"]);

    if (nameResult.exitCode !== 0 || emailResult.exitCode !== 0) {
      return null;
    }

    const name = nameResult.stdout.toString().trim();
    const email = emailResult.stdout.toString().trim();

    if (!name && !email) {
      return null;
    }

    return {
      name: name || "Unknown",
      email: email || "unknown@example.com",
    };
  } catch {
    return null;
  }
}

export function getGitIdentifier(): string | undefined {
  const user = getGitUser();
  if (!user) {
    return undefined;
  }
  return user.email || user.name;
}

export function normalizeFilePath(
  absolutePath: string,
  repoRoot: string
): string {
  if (absolutePath.startsWith(repoRoot)) {
    return absolutePath.slice(repoRoot.length + 1);
  }
  return absolutePath;
}
