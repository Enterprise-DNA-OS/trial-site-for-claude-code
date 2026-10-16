---
description: "Every participant with status, consent version, baseline date and coordinator."
---

# /participants

List participants, filtered with --study when the operator names one.

```bash
node scripts/trial.mjs participants --study="<protocol>"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
