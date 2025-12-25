# Decision Types

Guide for choosing the right decision type.

## Overview

| Type | When to Use | Affects |
|------|-------------|---------|
| `product` | Business logic, features, limits | What users see/do |
| `process` | How we work, patterns, style | How code is written |
| `constraint` | Hard limits, requirements | What can't be violated |
| `learning` | Failed approaches, discoveries | What we learned |

## Product Decisions

Use for business logic that affects user-facing behavior.

**Examples:**
- "Free plan = 5 users"
- "Support Google and GitHub OAuth only"
- "Retry failed payments 3 times"
- "Show upgrade prompt after 80% usage"

**Recording:**
```bash
keel decide \
  --type product \
  --problem "Need to set free plan limits" \
  --choice "Free plan = 5 users, 10GB storage" \
  --rationale "Analytics show 80% stay under these limits"
```

## Process Decisions

Use for decisions about how code should be written.

**Examples:**
- "Use functional style, not OOP"
- "Result type pattern, not exceptions"
- "Components use hooks, not HOCs"
- "API responses follow JSON:API spec"

**Recording:**
```bash
keel decide \
  --type process \
  --problem "Need consistent error handling" \
  --choice "Use Result type pattern, not exceptions" \
  --rationale "More explicit, easier to test, no hidden control flow"
```

## Constraint Decisions

Use for hard limits that cannot be violated.

**Examples:**
- "Must support IE11"
- "Max 100 RPS per user"
- "Never log full card numbers (PCI)"
- "All endpoints require authentication"
- "Response time < 200ms for core paths"

**Recording:**
```bash
keel decide \
  --type constraint \
  --problem "PCI compliance requirements" \
  --choice "Never log full card numbers" \
  --rationale "Required for PCI-DSS compliance" \
  --files "src/logging/sanitizer.ts"
```

## Learning Decisions

Use for knowledge gained from trying something.

**Examples:**
- "GraphQL subscriptions too complex for our needs"
- "In-memory cache caused OOM under load"
- "Polling was simpler than WebSockets for our case"
- "Microservices added too much overhead for team size"

**Recording:**
```bash
keel decide \
  --type learning \
  --problem "Tried GraphQL subscriptions for real-time" \
  --choice "Abandoned - too complex for our needs" \
  --rationale "Required Apollo Server, added 50KB to bundle, team unfamiliar"
```

## Decision Tree

```
Is it a hard limit that can't be violated?
├── YES → constraint
└── NO
    ├── Does it affect what users see/do?
    │   ├── YES → product
    │   └── NO
    │       ├── Is it about how code is written?
    │       │   ├── YES → process
    │       │   └── NO → learning (knowledge gained)
    └── Did we learn this by trying something?
        └── YES → learning
```

## When Type Is Unclear

If uncertain, ask:
1. **Would violating this break something for users?** → `product`
2. **Would violating this break compliance/SLA?** → `constraint`
3. **Is this about code style/patterns?** → `process`
4. **Did we learn this the hard way?** → `learning`

When still unclear, default to `product` for user-facing or `process` for internal.
