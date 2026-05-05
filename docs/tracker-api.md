# Tracker API

Raw SQL endpoint for managing tracker tasks without MCP.

**Base URL:** `https://engdawood.com` (or `http://localhost:4321` locally)

## Auth

Either a session cookie (from being logged into the admin) or a Bearer token:

```
Authorization: Bearer YOUR_EMDASH_TOKEN
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/tracker` | Run a SQL query |
| `POST` | `/api/tracker/upload` | Upload a file to a task |
| `GET` | `/api/tracker/files/:taskId` | List files attached to a task |
| `DELETE` | `/api/tracker/file` | Delete a file from a task |
| `GET` | `/api/tracker/file/:key` | Serve/download a file |

---

## POST /api/tracker

Accepts any SQLite query as `{ sql, params }`. Returns D1 result with `results[]` and `meta`.

### Create a task

```bash
curl -X POST https://engdawood.com/api/tracker \
  -H "Authorization: Bearer YOUR_EMDASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "INSERT INTO tasks (client, task, title_ar, type, deadline, priority, status, price, payment, course, university, claude_account, fatora_status, instructions, notes, log, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    "params": [
      "ClientName",
      "Task title EN",
      "عنوان المهمة",
      "Assignment",
      "2026-05-15",
      "med",
      "new",
      500,
      "unpaid",
      "Course 101",
      "KFUPM",
      "Pro",
      "unknown",
      "",
      "",
      "[]",
      "2026-05-04 10:00:00",
      "2026-05-04 10:00:00"
    ]
  }'
```

Response includes `meta.last_row_id` — the new task's ID.

### List tasks

```bash
curl -X POST https://engdawood.com/api/tracker \
  -H "Authorization: Bearer YOUR_EMDASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM tasks ORDER BY id DESC LIMIT 10", "params": null}'
```

### Update a task

```bash
curl -X POST https://engdawood.com/api/tracker \
  -H "Authorization: Bearer YOUR_EMDASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "UPDATE tasks SET status = ?, updated_at = datetime('"'"'now'"'"') WHERE id = ?", "params": ["done", 42]}'
```

### Delete a task

```bash
curl -X POST https://engdawood.com/api/tracker \
  -H "Authorization: Bearer YOUR_EMDASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "DELETE FROM tasks WHERE id = ?", "params": [42]}'
```

---

## Field Reference

| Field | Column | Type | Notes |
|-------|--------|------|-------|
| `client` | `client` | string | Client name |
| `title_en` | `task` | string | Task title (English) |
| `title_ar` | `title_ar` | string | Task title (Arabic) |
| `type` | `type` | string | `Assignment`, `Project`, etc. |
| `deadline` | `deadline` | string | `YYYY-MM-DD` |
| `priority` | `priority` | string | `low`, `med`, `high` |
| `status` | `status` | string | `new`, `in_progress`, `done`, `cancelled` |
| `price` | `price` | number | Amount |
| `payment` | `payment` | string | `unpaid`, `paid`, `partial` |
| `course` | `course` | string | Course name |
| `university` | `university` | string | University name |
| `claude_account` | `claude_account` | string | `Pro`, `Free`, etc. |
| `fatora_status` | `fatora_status` | string | `unknown`, `sent`, `paid` |
| `fatora_link` | `fatora_link` | string\|null | Payment link URL |
| `instructions` | `instructions` | string | Task instructions |
| `notes` | `notes` | string | Internal notes |
| `log` | `log` | JSON string | Array of log entries `[]` |
