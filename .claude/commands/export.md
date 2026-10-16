---
description: "Export the whole database to a JSON backup."
---

# /export

Run before any schema change.

```bash
node scripts/trial.mjs export --out=backup.json
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
