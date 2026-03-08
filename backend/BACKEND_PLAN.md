# BACKEND_PLAN.md — Student Study Copilot (Node.js + TypeScript)

## 1) Build Checklist (Incremental Order)

1. **Foundation** — Initialize project, TypeScript, ESLint, Prettier, env config
2. **Database** — Prisma setup, Postgres schema (projects, documents), migrations
3. **Core middleware** — Error handler, auth stub, request validation (zod), rate limiting, logging
4. **Projects API** — CRUD endpoints for projects (scoped by userId)
5. **Storage service** — Local file storage with S3-ready interface
6. **Documents API** — Upload endpoint (multipart), document listing, status tracking
7. **Ingestion pipeline** — PDF parsing → chunking → embedding → vector upsert (LangChain)
8. **Vector DB** — pgvector integration via LangChain, multi-tenant metadata
9. **Background job readiness** — Synchronous MVP, BullMQ-ready design
10. **Testing** — Unit, integration, E2E flow
11. **Dev tooling** — Docker Compose (Postgres + pgvector), scripts, env vars

---

## 2) Folder Structure

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts                        # Entry point
│   ├── app.ts                          # Express app factory
│   ├── config/
│   │   └── index.ts                    # Env config (dotenv + zod validation)
│   ├── middleware/
│   │   ├── auth.ts                     # Auth stub (userId from header/token)
│   │   ├── errorHandler.ts            # Centralized error middleware
│   │   ├── rateLimiter.ts             # Rate limiting
│   │   ├── requestLogger.ts           # Safe logging (no PII)
│   │   └── validate.ts                # Zod validation middleware
│   ├── modules/
│   │   ├── projects/
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── projects.routes.ts
│   │   │   ├── projects.schema.ts      # Zod schemas
│   │   │   └── projects.types.ts
│   │   └── documents/
│   │       ├── documents.controller.ts
│   │       ├── documents.service.ts
│   │       ├── documents.routes.ts
│   │       ├── documents.schema.ts
│   │       └── documents.types.ts
│   ├── services/
│   │   ├── storage/
│   │   │   ├── storage.interface.ts    # Abstract storage interface
│   │   │   ├── local.storage.ts        # Local filesystem impl
│   │   │   └── index.ts               # Factory
│   │   ├── ingestion/
│   │   │   ├── ingestion.service.ts    # Orchestrator
│   │   │   ├── pdf.parser.ts           # PDF text extraction (LangChain)
│   │   │   ├── chunker.ts             # Text chunking (LangChain)
│   │   │   ├── embeddings.ts          # Embeddings provider (LangChain)
│   │   │   └── vectorStore.ts         # pgvector via LangChain
│   │   └── queue/
│   │       ├── queue.interface.ts      # Abstract queue interface
│   │       └── sync.queue.ts           # Synchronous MVP impl
│   ├── lib/
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── errors.ts                   # Custom error classes
│   │   └── logger.ts                   # Logger (pino, safe)
│   └── types/
│       └── express.d.ts                # Express augmentation (req.user)
├── tests/
│   ├── unit/
│   │   ├── projects.service.test.ts
│   │   ├── documents.service.test.ts
│   │   └── ingestion.service.test.ts
│   ├── integration/
│   │   ├── projects.routes.test.ts
│   │   └── documents.routes.test.ts
│   └── e2e/
│       └── upload-flow.test.ts
├── uploads/                            # Local file storage (gitignored)
├── .env.example
├── .gitignore
├── docker-compose.yml
├── tsconfig.json
├── jest.config.ts
├── package.json
└── README.md
```

---

## 3) Module Descriptions

### `src/config/index.ts`
- **Responsibility**: Load and validate environment variables
- **Exports**: `config` object (typed)
- **Key types**: `AppConfig`

### `src/lib/prisma.ts`
- **Responsibility**: Singleton Prisma client
- **Exports**: `prisma` instance

### `src/lib/errors.ts`
- **Responsibility**: Custom typed error classes
- **Exports**: `AppError`, `NotFoundError`, `ValidationError`, `ConflictError`

### `src/lib/logger.ts`
- **Responsibility**: Structured logging (no PII)
- **Exports**: `logger` (pino instance)

### `src/modules/projects/`
- **Service**: CRUD for projects scoped by `userId`
- **Controller**: Maps HTTP → service calls
- **Routes**: `GET /api/projects`, `POST /api/projects`
- **Schema**: Zod schemas for request validation

### `src/modules/documents/`
- **Service**: Upload, list, status tracking
- **Controller**: Handles multipart upload, triggers ingestion
- **Routes**: `GET /api/projects/:projectId/documents`, `POST /api/projects/:projectId/documents`
- **Schema**: Zod schemas for params/query validation

### `src/services/storage/`
- **Interface**: `IStorageService { save(file, path): Promise<string>; delete(path): Promise<void>; getPath(path): string }`
- **Local impl**: Saves to `uploads/` directory
- **S3 impl**: (future) Same interface, S3 SDK

### `src/services/ingestion/`
- **Orchestrator**: Coordinates parse → chunk → embed → upsert
- **PDF parser**: Uses LangChain `PDFLoader`
- **Chunker**: Uses LangChain `RecursiveCharacterTextSplitter` (500 tokens, 50 overlap)
- **Embeddings**: LangChain `GeminiEmbeddings` (pluggable)
- **Vector store**: LangChain `PGVectorStore` with pgvector

### `src/services/queue/`
- **Interface**: `IJobQueue { enqueue(jobType, payload): Promise<void> }`
- **Sync impl**: Runs immediately (MVP)
- **BullMQ impl**: (future) Same interface, Redis-backed

---

## 4) API Endpoints

### Projects
| Method | Path | Request | Response | Status |
|--------|------|---------|----------|--------|
| GET | `/api/projects` | — | `{ projects: Project[] }` | 200 |
| POST | `/api/projects` | `{ name: string }` | `{ project: Project }` | 201 |

### Documents
| Method | Path | Request | Response | Status |
|--------|------|---------|----------|--------|
| GET | `/api/projects/:projectId/documents` | — | `{ documents: DocumentItem[] }` | 200 |
| POST | `/api/projects/:projectId/documents` | `multipart/form-data (file)` | `{ document: DocumentItem }` | 201 |

### Error Responses
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": []
  }
}
```
Status codes: 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 413 (file too large), 415 (unsupported type), 429 (rate limit), 500 (internal)

---

## 5) DB Schema (Prisma)

See `prisma/schema.prisma` for full definitions.

**Tables**: `User` (stub), `Project`, `Document`
**Key constraints**: unique (userId, name) on Project; foreign keys with cascade delete.
**Indexes**: (userId) on Project; (projectId, status) on Document.

---

## 6) Ingestion Pipeline

- **PDF parsing**: LangChain `PDFLoader` (uses pdf-parse under the hood)
- **Chunking**: LangChain `RecursiveCharacterTextSplitter` — 500 tokens (~2000 chars), 50 token overlap (~200 chars)
- **Embeddings**: LangChain `GeminiEmbeddings` (text-embedding-004). Pluggable via interface.
- **Vector DB**: **pgvector** via LangChain `PGVectorStore`
  - Why: Same Postgres instance, no extra infra, LangChain native support, good enough for MVP scale
- **Metadata per vector**: `{ userId, projectId, documentId, chunkIndex, source }`
- **Upsert strategy**: Delete all vectors for documentId before insert (idempotent re-index)
- **Delete by project**: Filter delete by `projectId` metadata

---

## 7) Background Job Design

**MVP**: Synchronous — ingestion runs inline after upload responds with `UPLOADED` status. Status updated to `PROCESSING` → `INDEXED`/`FAILED`.

**Async refactor path**:
1. Replace `SyncQueue` with `BullMQQueue` (same `IJobQueue` interface)
2. Upload endpoint enqueues job, returns immediately with `UPLOADED`
3. Worker process picks up job, runs ingestion pipeline
4. No API changes needed — frontend already polls status

---

## 8) Security & Robustness

- Auth middleware reads `userId` from `req.user.id` (JWT stub for dev)
- Zod validation on all request bodies/params
- Rate limiting: 100 req/min general, 10 req/min upload
- File validation: PDF only (mime + extension), max 50MB
- Multer with limits and file filter
- Safe logging: pino with redaction paths for sensitive fields
- Consistent error response shape via error middleware
- Helmet for security headers
- CORS configured

---

## 9) Testing Plan

- **Unit**: Services with mocked Prisma/storage/vector DB
- **Integration**: Routes with supertest, mocked services
- **E2E**: Create project → upload PDF → poll until INDEXED (mocked embeddings)

---

## 10) Local Dev

```bash
# Start Postgres + pgvector
docker compose up -d

# Install deps
npm install

# Generate Prisma client + run migrations
npx prisma generate
npx prisma migrate dev

# Start dev server
npm run dev

# Run tests
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Environment Variables
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/study_copilot?schema=public
GOOGLE_API_KEY=...
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=debug
```
