# CI Pipeline with SonarCloud Analysis — Design

**Date:** 2026-07-05
**Status:** Approved
**Scope:** CI only — no deployment stage. Deploys are a future, separate design.

## Goal

Every pull request and every push to `main` runs lint, unit/integration/e2e tests
for both apps, and a SonarCloud quality analysis covering the whole monorepo.
A failing test or a failing Sonar Quality Gate blocks the workflow (and therefore
the PR when branch protection is enabled).

## Context

- npm-workspaces monorepo: `apps/ai-engine` (AI library), `apps/backend`
  (Express API, consumes ai-engine), `apps/frontend` (React/Vite).
- Root `.npmrc` sets `legacy-peer-deps=true` (langchain peer conflict), so
  `npm ci` works out of the box.
- `npm ci` triggers ai-engine's `prepare` script, which compiles it to `dist/`
  — no explicit build-ordering step is needed before backend tests.
- Backend integration/e2e tests mock Prisma and the vector/embeddings layer —
  **no Postgres/Qdrant services are needed in CI**.
- `apps/backend/tests/integration/openai.embeddings.test.ts` makes a live
  OpenAI call and is excluded from CI by design.
- Backend has no ESLint config (pre-existing); CI runs lint for frontend only.

## Decisions (settled during brainstorming)

| Question | Decision |
| --- | --- |
| CI vs CD | CI only |
| Sonar variant | SonarCloud (SaaS) |
| Triggers | `pull_request` + `push` to `main` |
| Quality Gate | Blocking — gate failure fails the workflow |
| Job structure | Parallel per-app test jobs + one unified Sonar job (Approach A) |
| Playwright browsers in CI | Chromium only (3-browser matrix stays local) |

## Workflow design

One file: `.github/workflows/ci.yml`.

```text
pull_request / push(main)
        │
   ┌────┴─────┐
backend-test  frontend-test        (parallel)
   └────┬─────┘
      sonar                        (needs both; downloads coverage artifacts)
```

### Shared job setup

Each job: `actions/checkout` → `actions/setup-node` (Node 20, `cache: npm`)
→ `npm ci` at repo root.

### Job: backend-test

1. `npm run test:ci --workspace=apps/backend`
   - New script in `apps/backend/package.json`:
     `jest --coverage --testPathIgnorePatterns=tests/integration/openai.embeddings.test.ts`
2. Upload `apps/backend/coverage/lcov.info` as artifact `backend-coverage`.

### Job: frontend-test

1. `npm run lint --workspace=apps/frontend`
2. `npm run test:coverage --workspace=apps/frontend` (Jest unit tests)
3. `npx playwright install --with-deps chromium`
4. `npm run test:e2e --workspace=apps/frontend -- --project=chromium`
   (Playwright config already sets CI behavior: `forbidOnly`, retries,
   auto-started Vite dev server.)
5. Upload `apps/frontend/coverage/lcov.info` as artifact `frontend-coverage`.

### Job: sonar

1. Checkout with `fetch-depth: 0` (Sonar needs full history for new-code detection).
2. Download both coverage artifacts into their original paths.
3. Run `SonarSource/sonarqube-scan-action` (SonarCloud) with
   `SONAR_TOKEN` from repo secrets.
4. Quality Gate check is blocking (`sonar.qualitygate.wait=true`).

### Sonar configuration — root `sonar-project.properties`

```properties
sonar.projectKey=<org>_study.AI          # set after creating the SonarCloud project
sonar.organization=<org>
sonar.sources=apps/backend/src,apps/frontend/src,apps/ai-engine/src
sonar.tests=apps/backend/tests,apps/frontend/src/__tests__,apps/frontend/e2e
sonar.test.inclusions=**/__tests__/**,**/*.test.*,**/*.spec.*
sonar.javascript.lcov.reportPaths=apps/backend/coverage/lcov.info,apps/frontend/coverage/lcov.info
sonar.exclusions=**/node_modules/**,**/dist/**,apps/frontend/src/components/ui/**
```

`apps/frontend/src/components/ui/**` (generated shadcn/ui primitives) is
excluded from analysis so vendored component code doesn't drown the signal.
ai-engine sources are analyzed for quality/smells; its logic is exercised
through backend's test suite, so its line coverage arrives via the backend
lcov paths only where measured — no separate ai-engine test job exists yet.

## Error handling / failure modes

- **Any test failure** fails its job → sonar never runs → workflow red.
- **Quality Gate failure** fails the sonar job → workflow red. First runs may
  trip "coverage on new code" until a baseline exists; tune thresholds in
  SonarCloud UI, not in-repo.
- **Missing SONAR_TOKEN** fails only the sonar job; test jobs still report.
- **Playwright flake** is mitigated by the existing `retries: 2` CI setting.

## Manual setup (owner: Raj)

1. Create the SonarCloud organization + project for `Raj-SW/study.AI`
   (import from GitHub), note the project key/organization.
2. Add repo secret `SONAR_TOKEN` (SonarCloud → My Account → Security):
   `gh secret set SONAR_TOKEN` or GitHub → Settings → Secrets and variables →
   Actions.
3. Fill the real `sonar.projectKey` / `sonar.organization` into
   `sonar-project.properties`.
4. Optional: enable branch protection on `main` requiring the three checks.

## Out of scope

- Deployment/CD, Docker image builds.
- Backend ESLint setup (no config exists; deliberately skipped).
- Making the live OpenAI test skip gracefully without a key (local-only concern).
- Turborepo/Nx build caching — overkill at three packages.

## Testing the pipeline

Open a small PR after implementation; verify: both test jobs green, sonar job
waits on them, coverage visible in SonarCloud, gate result reflected on the PR.
