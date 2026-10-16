---
description: "Record a missed visit and the deviation that goes with it."
---

# /missed-visit

Record the reason the operator gives.

```bash
node scripts/trial.mjs miss "<subject>" "<visit>" --reason="<why>"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
