# Study Copilot

A monorepo for the Student Study Copilot app — upload documents, index them, and ask questions grounded in your own material (RAG).

## Structure

```
apps/
  ai-engine/  AI library: RAG, ingestion pipeline, LLM/embeddings providers (LangChain, Qdrant)
  backend/    Node.js + TypeScript API (Express, Prisma) — consumes ai-engine
  frontend/   React + TypeScript client (Vite)
docker-compose.yml   Shared infra: Postgres, Qdrant, Ollama
```

See [apps/backend/README.md](apps/backend/README.md) and [apps/frontend/README.md](apps/frontend/README.md) for app-specific setup and details.

## Getting started

```bash
npm install          # installs all workspaces from the root
npm run docker:up    # starts Postgres, Qdrant, Ollama
npm run dev          # runs everything: ai-engine watch + API + client
```

Or run pieces individually with `npm run dev:ai`, `npm run dev:backend`, `npm run dev:frontend`.

## Common scripts (run from root)

| Script | Description |
| --- | --- |
| `npm run dev` | Runs all three workspaces in one terminal (prefixed output) |
| `npm run build` | Builds all workspaces (ai-engine → backend → frontend) |
| `npm run test` | Runs tests in all workspaces |
| `npm run lint` | Lints all workspaces |
| `npm run dev:ai` | Rebuilds ai-engine on change (run alongside `dev:backend` when editing AI code) |
| `npm run docker:up` / `docker:down` | Starts/stops shared infra services |
