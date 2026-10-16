---
description: "Record a consent or re-consent: the version signed and the date."
---

# /consent

Use the version the operator states. Never assume a re-consent happened.

```bash
node scripts/trial.mjs consent "<subject>" --version=<version> --on=YYYY-MM-DD
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
