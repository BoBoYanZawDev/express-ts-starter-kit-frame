# Express API frame

Express 5 + TypeScript + Prisma/PostgreSQL, organized like the adjacent `furniture-backend` project. The sample domain is tasks; use it as a pattern for your own features.

## Structure

```text
config/
  errorCode.ts                  Shared Error_* codes
prisma/
  schema.prisma                 Task model
  migrations/                   Database migrations
prisma.config.ts                Prisma CLI configuration
src/
  app.ts                        Express middleware and router registration
  index.ts                      HTTP server and graceful shutdown
  config/env.ts                 Environment loading and validation
  controllers/
    api/TaskController.ts       Read controllers with validation arrays
    admin/TaskController.ts     Write controllers with validation arrays
  services/
    taskServices.ts             Named functions wrapping Prisma queries
  routes/
    createRouter.ts             Shared Router factory
    v1/
      index.ts                  /api/v1/user and /api/v1/admin mounts
      api/index.ts
      api/task.ts               Read routes
      admin/index.ts
      admin/task.ts             Write routes
  middlewares/
    errorHandler.ts             JSON errors and Prisma error mapping
    rateLimiter.ts              Per-IP API rate limit
    requestId.ts                X-Request-Id header
  utils/
    error.ts                    createError(message, status, code)
    check.ts                    Validation and missing-model checks
    logger.ts                   Winston logging
  lib/prisma.ts                 Shared Prisma client and PostgreSQL adapter
  generated/prisma/             Generated client (gitignored)
```

Routes map URLs to controller arrays. Controllers validate requests, call named service functions, check results, and return `res.status(...).json(...)`. Services contain typed Prisma queries. To add a feature, follow `TaskController.ts`, `taskServices.ts`, and the task routes, then mount the new router in the appropriate `index.ts`.

This frame contains no login/register or role enforcement. The `user` and `admin` prefixes organize routes only; both are public. Add authentication and authorization middleware at the router mounts before using private data.

## Setup

Requires Node.js 20.19+; verified with Node.js 24.

```sh
npm install
```

For a new checkout, copy `.env.example` to `.env`. If `.env` exists, merge needed settings without overwriting your secrets. Set a PostgreSQL connection string:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/express_frame?schema=public"
```

Create that database, then run:

```sh
npm run db:deploy
npm run dev
```

Prisma is the ORM. The shared client uses `@prisma/adapter-pg`, honors the URL's `schema` parameter, and disconnects on shutdown. Task records persist across server restarts. The previous Prisma draft remains in `examples/prisma.ts.example` as historical reference.

## Commands

```sh
npm run typecheck
npm run build
npm start
npm run db:generate
npm run db:validate
npm run db:migrate -- --name describe_your_change
npm run db:deploy
npm run db:studio
npm test
```

Dev uses `tsx watch`. Build, dev, and typecheck generate Prisma Client automatically. Because root-level `config/` is included in TypeScript, compilation preserves `src/` inside `dist/`; `npm start` runs `dist/src/index.js`.

Use `db:migrate` to create migrations locally after schema changes, and `db:deploy` to apply committed migrations.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Process health; does not query the database |
| GET | `/api/v1/user/tasks?page=1&limit=20` | Read tasks with offset pagination |
| GET | `/api/v1/user/tasks/:id` | Read one task |
| POST | `/api/v1/admin/tasks` | Create a task |
| PATCH | `/api/v1/admin/tasks/:id` | Update title and/or completed |
| DELETE | `/api/v1/admin/tasks/:id` | Delete a task |

Task IDs are UUIDs. Titles contain 1–200 characters after trimming. `completed` is a JSON boolean. Unknown body fields and empty updates are rejected. Pagination accepts page 1–1000000 and limit 1–100. Like the furniture backend, pagination fetches one extra row to return `hasNextPage`, `nextPage`, and `previousPage`.

```sh
curl http://localhost:3000/api/v1/health

curl -X POST http://localhost:3000/api/v1/admin/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Build my API","completed":false}'

curl 'http://localhost:3000/api/v1/user/tasks?page=1&limit=20'
```

Success responses contain a message and the resource directly:

```json
{
  "message": "Task fetched successfully.",
  "task": { "id": "generated-uuid", "title": "Build my API", "completed": false,
    "createdAt": "2026-10-16T00:00:00.000Z", "updatedAt": "2026-10-16T00:00:00.000Z" }
}
```

Errors use the furniture backend's `{ message, error }` format:

```json
{
  "message": "Task not found.",
  "error": "Error_NotFound"
}
```

Create errors using `createError(message, status, errorCode.invalid)`. Express 5 forwards thrown errors and rejected controller promises to the central error handler. Validation returns 400, missing records/routes return 404, database conflicts return 409, oversized bodies return 413, and rate limiting returns 429. Internal errors use a generic 500 message and are logged server-side. Stack traces and rejected field values are not returned. Every request includes an `X-Request-Id` response header.

## Configuration

See `.env.example`:

- `PORT`: defaults to 3000.
- `CORS_ORIGINS`: comma-separated browser origins. Empty permits only requests without an Origin header. `*` permits any origin and disables credentialed CORS. CORS is not authentication.
- `TRUST_PROXY_HOPS`: defaults to 0; configure only for a known trusted reverse proxy setup.
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`: default 200 requests per IP per two minutes on `/api`. The store is per process; use a shared store for multiple instances.
- `LOG_LEVEL`: defaults to info. Logs go to stdout.
- `LOG_TO_FILE=true`: adds rotating log files under `logs/`.

Redis, queues, schedules, uploads, and furniture-specific domain features are not part of this API frame.

## Tests

HTTP tests use Node's test runner and Supertest. Database tests require an exported `TEST_DATABASE_URL` pointing at a **separate test database**:

```sh
DATABASE_URL="$TEST_DATABASE_URL" npm run db:deploy
npm test
```

Tests never use the application's `DATABASE_URL`. They create and clean up their own records, including verifying persistence with a second Prisma client. Without `TEST_DATABASE_URL`, database-dependent tests are explicitly skipped.
