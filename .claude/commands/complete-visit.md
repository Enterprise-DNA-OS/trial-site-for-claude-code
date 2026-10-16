---
description: "Mark a visit done, who performed it and when. Records the sponsor fee it earned and shows any record check it trips."
---

# /complete-visit

Show the window and whether the visit landed in it. If a finding comes back, say it plainly and offer /deviation.

```bash
node scripts/trial.mjs complete "<subject>" "<visit>" --by="<staff>" --on=YYYY-MM-DD
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
