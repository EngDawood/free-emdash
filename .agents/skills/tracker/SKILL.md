---
name: tracker
description: |
  Add, update, list, or manage tasks in the work tracker. Use this skill whenever the user wants to:
  - Log or save a task they just discussed ("add this to tracker", "save this task", "log it")
  - Create a new tracker task from details in the conversation
  - Update an existing task's status, price, deadline, or any other field
  - Check what tasks are open, pending payment, or due soon
  
  Trigger even if the user doesn't say "tracker" explicitly — if they finished discussing a client task and say "ok save it" or "add it", use this skill.
---

# Tracker Skill

Generate ready-to-run `curl` commands that call the tracker REST API. No MCP or tools needed — output the command, user runs it.

**API endpoint:** `POST https://engdawood.com/api/tracker`  
**Auth:** `Authorization: Bearer YOUR_EMDASH_TOKEN`  
**Body:** `{ "sql": "...", "params": [...] }`

---

## Creating a Task

Extract details from the conversation and output this curl command filled in:

```bash
curl -X POST https://engdawood.com/api/tracker \
  -H "Authorization: Bearer YOUR_EMDASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "INSERT INTO tasks (client, task, title_ar, type, deadline, priority, status, price, payment, course, university, claude_account, fatora_status, instructions, notes, log, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    "params": [
      "CLIENT",
      "TITLE_EN",
      "TITLE_AR",
      "TYPE",
      "DEADLINE",
      "PRIORITY",
      "STATUS",
      PRICE,
      "PAYMENT",
      "COURSE",
      "UNIVERSITY",
      "CLAUDE_ACCOUNT",
      "unknown",
      "INSTRUCTIONS",
      "NOTES",
      "[]",
      "CREATED_AT",
      "CREATED_AT"
    ]
  }'
```

The response includes `meta.last_row_id` — the new task ID.

### Fields to extract from context

| Placeholder | What to put | Default |
|-------------|-------------|---------|
| `CLIENT` | Client name — **ask if missing** | — |
| `TITLE_EN` | Task title in English | — |
| `TITLE_AR` | Task title in Arabic — translate yourself if not provided | — |
| `TYPE` | Assignment, Project, Exam, Report, Lab, Thesis | `Assignment` |
| `DEADLINE` | `YYYY-MM-DD` — compute from relative dates ("next Sunday") | `""` |
| `PRIORITY` | `hi`, `med`, `lo` | `med` |
| `STATUS` | `new`, `progress`, `done`, `cancel` | `new` |
| `PRICE` | Number in SAR (no quotes) | `0` |
| `PAYMENT` | `paid`, `half`, `unpaid` | `unpaid` |
| `COURSE` | Course name or code | `""` |
| `UNIVERSITY` | University or institution name | `""` |
| `CLAUDE_ACCOUNT` | Name of the Claude account used for this task (e.g. "Main", "Backup", "Client1") | `""` |
| `INSTRUCTIONS` | Task requirements | `""` |
| `NOTES` | Internal notes | `""` |
| `CREATED_AT` | Current datetime as `YYYY-MM-DD HH:MM:SS` | now |

### Rules

- Only ask for `client` if it's truly missing — infer everything else or use defaults
- Always translate `title_ar` yourself, don't leave it empty
- For `PRICE`, write the raw number without quotes: `500` not `"500"`
- For empty strings, write `""` in the params

---

## Updating a Task

```bash
curl -X POST https://engdawood.com/api/tracker \
  -H "Authorization: Bearer YOUR_EMDASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "UPDATE tasks SET status = ?, updated_at = datetime('"'"'now'"'"') WHERE id = ?", "params": ["done", ID]}'
```

Build the `SET` clause from only the fields that changed. Common updates:

| Goal | SQL snippet |
|------|-------------|
| Change status | `SET status = ?` |
| Mark paid | `SET payment = ?` |
| Set price | `SET price = ?` |
| Add notes | `SET notes = ?` |
| Multiple fields | `SET status = ?, payment = ?, updated_at = datetime('now')` |

Always append `updated_at = datetime('now')` to every UPDATE.

---

## Listing Tasks

```bash
curl -X POST https://engdawood.com/api/tracker \
  -H "Authorization: Bearer YOUR_EMDASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT id, client, task, deadline, status, price, payment FROM tasks ORDER BY deadline ASC NULLS LAST LIMIT 20", "params": null}'
```

Add a `WHERE` clause to filter: `WHERE status = 'new'`, `WHERE payment = 'unpaid'`, etc.

---

## Notes

- Replace `YOUR_EMDASH_TOKEN` with the actual token from `.dev.vars` or Cloudflare secrets
- Always output the full command — never a partial snippet
- If the user is on Windows PowerShell, escape inner quotes with `\"` instead of `'"'"'`
