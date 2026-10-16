---
description: "Bring subjects and visits across from CRIO report exports."
---

# /import

Read docs/replace-crio.md. Add the study and its schedule of assessments first. Always run with --dry-run first and show the counts. Import subjects before visits.

```bash
node scripts/trial.mjs import crio --kind=subjects --study="<protocol>" --file=<report.csv> --dry-run
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
