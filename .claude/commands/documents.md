---
description: "Render sponsor invoices, participant visit schedules, delegation logs, progress report packs and adverse event summaries as branded HTML."
---

# /documents

Render the document asked for, or all. Point the operator to the file in docs-out/.

```bash
npm run docs -- <document> <id-prefix>
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
