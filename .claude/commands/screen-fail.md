---
description: "Record a screen failure with the criterion and any screen failure fee the contract pays."
---

# /screen-fail

Ask for the reason if it is not given. The fee is in dollars.

```bash
node scripts/trial.mjs screen-fail "<subject>" --reason="<criterion>" --fee=<dollars>
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
