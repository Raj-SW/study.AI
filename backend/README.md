# Student Study Copilot — Backend

Node.js + TypeScript backend for the Student Study Copilot app. Handles project management, PDF upload, text extraction, chunking, embedding, and vector storage for RAG.

## Architecture

```
Clean Architecture: Routes → Controllers → Services → Repositories (Prisma)
Ingestion Pipeline: PDF → Parse (LangChain) → Chunk → Embed (Gemini) → pgvector
```

**Key design decisions:**
- **pgvector** over Qdrant — same Postgres instance, zero extra infra, LangChain native support
- **LangChain** for the entire ingestion pipeline (PDFLoader, RecursiveCharacterTextSplitter, GeminiEmbeddings, PGVectorStore)
- **Multi-tenant isolation** — every vector record includes `userId`, `projectId`, `documentId` metadata
- **Queue abstraction** — synchronous MVP with interface ready for BullMQ swap

## Quick Start

```bash
# 1. Start Postgres + pgvector
docker compose up -d

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your GOOGLE_API_KEY

# 4. Setup database
npx prisma generate
npx prisma migrate dev --name init

# 5. Start dev server
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id/documents` | List project documents |
| POST | `/api/projects/:id/documents` | Upload PDF (multipart) |

**Auth**: Set `x-user-id` header (dev stub). All endpoints except health require auth.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3001` | Server port |
| `DATABASE_URL` | — | Postgres connection string |
| `GOOGLE_API_KEY` | — | Google API key for Gemini embeddings |
| `UPLOAD_DIR` | `./uploads` | Local file storage path |
| `MAX_FILE_SIZE_MB` | `50` | Max upload size |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | Pino log level |

## Testing

```bash
npm run test          # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e      # E2E flow tests
```

## Ingestion Pipeline

1. **Upload**: PDF saved to local storage, document record created with `UPLOADED` status
2. **Parse**: LangChain `PDFLoader` extracts text per page
3. **Chunk**: `RecursiveCharacterTextSplitter` (2000 chars / ~500 tokens, 200 char overlap)
4. **Embed**: Gemini `text-embedding-004` via LangChain
5. **Store**: pgvector via LangChain `PGVectorStore` with multi-tenant metadata
6. **Status**: Updated to `INDEXED` on success, `FAILED` with error message on failure

## Async Migration Path

Current: synchronous (runs after upload response via `setImmediate`).

To switch to async:
1. Implement `BullMQQueue` with the same `IJobQueue` interface
2. Upload endpoint enqueues job, returns immediately
3. Separate worker process runs ingestion
4. No API changes needed — frontend already polls document status
