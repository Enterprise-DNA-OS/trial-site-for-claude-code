---
description: "Record a note against a study, optionally a participant."
---

# /log

Keep the operator's words.

```bash
node scripts/trial.mjs log "<protocol>" <note> --participant="<subject>"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
