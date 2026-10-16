---
description: "Raise one invoice to the sponsor for everything earned and not yet invoiced on a study. Creates the record; nothing is sent."
---

# /invoice

Show the lines and total. Offer to render it with /documents.

```bash
node scripts/trial.mjs invoice "<protocol>"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
