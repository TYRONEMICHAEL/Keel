# CLI Reference

Complete command reference for the keel CLI.

## Commands

### keel init

Initialize keel in current repository. **Humans only - agents should not run this.**

```bash
keel init
```

Creates `.keel/` directory with empty decision ledger.

---

### keel decide

Record a new decision.

```bash
keel decide [flags]
```

**Required flags:**
- `--type <type>` - Decision type: product, process, constraint, learning
- `--problem "..."` - What problem this addresses
- `--choice "..."` - What was decided

**Optional flags:**
- `--rationale "..."` - Why this choice was made
- `--files "a.ts,b.ts"` - Comma-separated affected files
- `--symbols "Foo,Bar"` - Comma-separated affected symbols
- `--refs "JIRA-123,bd-abc"` - External references
- `--agent` - Mark as agent decision
- `--supersedes DEC-xxxx` - ID of decision this supersedes

**Example:**
```bash
keel decide \
  --type product \
  --problem "Need to choose database" \
  --choice "PostgreSQL with Prisma" \
  --rationale "Team familiarity, strong typing" \
  --files "src/db/schema.prisma" \
  --refs "bd-db-123"
```

---

### keel context

Get decisions affecting a file or reference.

```bash
keel context <path>
keel context --ref <id>
```

**Flags:**
- `--ref <id>` - Query by external reference instead of file
- `--json` - Output as JSON

**Examples:**
```bash
keel context src/auth/oauth.ts
keel context --ref bd-auth-123
keel context --json src/billing/checkout.ts
```

---

### keel search

Full-text search across decisions.

```bash
keel search <query> [flags]
```

**Flags:**
- `--type <type>` - Filter by type
- `--status <status>` - Filter by status (active, superseded)
- `--json` - Output as JSON

**Examples:**
```bash
keel search "authentication"
keel search --type constraint
keel search --status active "database"
```

---

### keel why

Show full decision details.

```bash
keel why <id>
```

**Flags:**
- `--json` - Output as JSON

**Examples:**
```bash
keel why DEC-a1b2
keel why a1b2        # Short form works
keel why --json DEC-a1b2
```

---

### keel supersede

Replace a decision with a new one.

```bash
keel supersede <id> [flags]
```

**Required flags:**
- `--choice "..."` - New choice

**Optional flags:**
- `--problem "..."` - New problem statement (defaults to original)
- `--rationale "..."` - Why this supersedes the original
- `--files "..."` - New file list
- `--refs "..."` - New references
- `--agent` - Mark as agent decision

**Example:**
```bash
keel supersede DEC-a1b2 \
  --problem "5 user limit causing churn" \
  --choice "Free plan = 10 users" \
  --rationale "Analytics show retention improves"
```

---

### keel validate

Check that file references still exist.

```bash
keel validate
```

Reports decisions with broken file references.

---

### keel curate

Get decisions ready for summarization.

```bash
keel curate [flags]
```

**Flags:**
- `--older-than <days>` - Only include decisions older than N days
- `--type <type>` - Filter by type
- `--file-pattern "..."` - Filter by file pattern
- `--json` - Output as JSON

**Examples:**
```bash
keel curate --older-than 30
keel curate --type learning
keel curate --file-pattern "src/auth/*"
```

---

### keel upgrade

Upgrade to latest version.

```bash
keel upgrade [flags]
```

**Flags:**
- `--check` - Only check for updates, don't install

**Examples:**
```bash
keel upgrade           # Download and install latest
keel upgrade --check   # Just check if update available
```
