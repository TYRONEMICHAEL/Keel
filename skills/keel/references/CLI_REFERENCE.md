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
- `--type <type>` - Decision type: product, process, constraint
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

**Tip:** Include commit hash for rollback capability:
```bash
--refs "commit:$(git rev-parse HEAD)"
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

### keel sql

Execute read-only SQL against the decision index.

```bash
keel sql <query> [flags]
```

**Flags:**
- `--json` - Output as JSON array

**Schema:**
```sql
decisions (id, type, status, problem, choice, rationale, created_at, raw_json)
-- status: 'active' = in effect, 'superseded' = replaced by newer decision
decision_files (decision_id, file_path)
decision_refs (decision_id, ref_id)
decision_symbols (decision_id, symbol)
```

**Examples:**
```bash
# All active decisions
keel sql "SELECT raw_json FROM decisions WHERE status = 'active'"

# All constraints
keel sql "SELECT raw_json FROM decisions WHERE type = 'constraint' AND status = 'active'"

# Search by content
keel sql "SELECT raw_json FROM decisions WHERE problem LIKE '%auth%' OR choice LIKE '%auth%'"

# Decisions for files
keel sql "SELECT d.raw_json FROM decisions d JOIN decision_files df ON d.id = df.decision_id WHERE df.file_path LIKE '%billing%'"

# JSON output
keel sql "SELECT * FROM decisions" --json
```

**Note:** Only SELECT queries are allowed. INSERT, UPDATE, DELETE will be rejected.

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
keel curate --type constraint
keel curate --file-pattern "src/auth/*"
```

---

### keel graph

Output decision graph as Mermaid diagram.

```bash
keel graph [flags]
```

**Flags:**
- `--files` - Include file associations in graph

**Examples:**
```bash
keel graph              # Show decisions with supersession chains and bead links
keel graph --files      # Also include file associations
```

Output can be pasted into any Mermaid viewer (GitHub, Notion, mermaid.live, etc).

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
