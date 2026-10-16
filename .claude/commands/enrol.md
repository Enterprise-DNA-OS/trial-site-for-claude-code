---
description: "Enrol a participant: set the baseline date and lay out every visit from the schedule of assessments."
---

# /enrol

Confirm consent is recorded first. Show the visits added and the first window.

```bash
node scripts/trial.mjs enrol "<subject>" --baseline=YYYY-MM-DD
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
