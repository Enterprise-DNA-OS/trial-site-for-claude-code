---
description: "Log a serious adverse event the moment the site hears of it. Starts the sponsor reporting clock."
---

# /sae

Record the time the site became aware, not the time of the event. Then show the report-by time.

```bash
node scripts/trial.mjs sae "<subject>" "<description>" --aware-at="YYYY-MM-DD HH:MM"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
