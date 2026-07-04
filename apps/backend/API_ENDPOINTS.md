# API Endpoints

Base URL: `http://localhost:3001`

All authenticated endpoints require the `x-user-id` header (dev mode) or `Authorization: Bearer <token>`.

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |

**Response:**
```json
{ "status": "ok", "timestamp": "2026-03-31T00:00:00.000Z" }
```

---

## Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects` | Yes | List all projects for the authenticated user |
| POST | `/api/projects` | Yes | Create a new project |
| DELETE | `/api/projects/:projectId` | Yes | Delete a project and all associated data |

### POST `/api/projects`

**Body:**
```json
{ "name": "string (1-100 chars, required)" }
```

**Response:**
```json
{
  "project": {
    "id": "uuid",
    "name": "string",
    "createdAt": "ISO timestamp"
  }
}
```

### GET `/api/projects`

**Response:**
```json
{
  "projects": [
    { "id": "uuid", "name": "string", "createdAt": "ISO timestamp" }
  ]
}
```

### DELETE `/api/projects/:projectId`

**Params:** `projectId` — UUID

**Response:** `204 No Content`

---

## Documents

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects/:projectId/documents` | Yes | List documents for a project |
| POST | `/api/projects/:projectId/documents` | Yes | Upload a PDF document |
| DELETE | `/api/projects/:projectId/documents/:documentId` | Yes | Delete a document and its vectors |

### POST `/api/projects/:projectId/documents`

**Content-Type:** `multipart/form-data`

**Form field:** `file` — PDF only, max 50 MB

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "projectId": "uuid",
    "filename": "notes.pdf",
    "status": "UPLOADED",
    "createdAt": "ISO timestamp"
  }
}
```

> Document status progresses: `UPLOADED` → `PROCESSING` → `INDEXED` (or `FAILED`).

### GET `/api/projects/:projectId/documents`

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "filename": "notes.pdf",
      "status": "INDEXED",
      "createdAt": "ISO timestamp",
      "error": null
    }
  ]
}
```

### DELETE `/api/projects/:projectId/documents/:documentId`

**Params:** `projectId`, `documentId` — both UUIDs

**Response:** `204 No Content`

---

## Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects/:projectId/chat` | Yes | Fetch conversation history |
| POST | `/api/projects/:projectId/chat` | Yes | Ask a question (RAG + conversation context) |
| DELETE | `/api/projects/:projectId/chat` | Yes | Clear conversation history |

### POST `/api/projects/:projectId/chat`

**Body:**
```json
{ "question": "string (required, non-empty)" }
```

**Response:**
```json
{
  "answer": "The answer based on your documents...",
  "sources": [
    {
      "documentId": "uuid",
      "chunkIndex": 0,
      "score": 0.87,
      "content": "Relevant chunk text..."
    }
  ],
  "userMessage": {
    "id": "uuid",
    "role": "USER",
    "content": "What is...?",
    "createdAt": "ISO timestamp"
  },
  "assistantMessage": {
    "id": "uuid",
    "role": "ASSISTANT",
    "content": "The answer based on your documents...",
    "sources": [...],
    "createdAt": "ISO timestamp"
  }
}
```

### GET `/api/projects/:projectId/chat`

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "USER",
      "content": "What is...?",
      "createdAt": "ISO timestamp"
    },
    {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "The answer is...",
      "sources": [...],
      "createdAt": "ISO timestamp"
    }
  ]
}
```

### DELETE `/api/projects/:projectId/chat`

**Response:** `204 No Content`

---

## Error Responses

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "path": "question", "message": "Required" }
    ]
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g. project name) |
| `UNSUPPORTED_FILE_TYPE` | 400 | Non-PDF upload |
| `FILE_TOO_LARGE` | 413 | File exceeds size limit |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
