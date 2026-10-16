---
description: "The delegation log: who is delegated which tasks on which study, from when, with their GCP training date."
---

# /delegation

Show the log, filtered with --study when one is named.

```bash
node scripts/trial.mjs delegation --study="<protocol>"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
