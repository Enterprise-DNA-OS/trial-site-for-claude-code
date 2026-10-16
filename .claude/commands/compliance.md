---
description: "Check the records against the rules in docs/compliance.md and report each gap with its source."
---

# /compliance

Read docs/compliance.md before explaining a finding. Never say the site is compliant; say what the checks found.

```bash
node scripts/trial.mjs compliance
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
