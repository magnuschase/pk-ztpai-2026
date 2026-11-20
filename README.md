# Room Booking API

[![CI](https://github.com/magnuschase/pk-ztpai-2026/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/magnuschase/pk-ztpai-2026/actions/workflows/ci.yml)

REST API for booking rooms: buildings, rooms and reservations with JWT authentication
(roles `USER` / `ADMIN`). Node.js + Express 5, PostgreSQL + Knex, validation with Zod,
OpenAPI documentation in Swagger UI.

## Running with Docker (from scratch)

Requirements: Git and Docker with Docker Compose.

```bash
git clone https://github.com/magnuschase/pk-ztpai-2026.git
cd pk-ztpai-2026
cp .env.example .env
docker compose up --build
```

That is all. Compose starts two containers:

- `db` - PostgreSQL 16 with a healthcheck; data is kept in the named volume `room-booking-pgdata`,
- `api` - starts once `db` is healthy, runs the database migrations, then the server.

When the log shows `Server is running`:

- API: `http://localhost:3000/api/...` (e.g. `POST /api/auth/register`, `GET /api/rooms`)
- Swagger UI: <http://localhost:3000/api/docs>

### Sample data and the ADMIN account

In a second terminal, while the containers are running:

```bash
docker compose exec api npx knex seed:run
```

The seed **empties all tables** and inserts buildings, rooms, reservations and these accounts:

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `admin-dev-password` | `ADMIN` |
| `jan.kowalski@example.com` | `user-dev-password` | `USER` |

Log in with `POST /api/auth/login`, then paste `accessToken` under **Authorize** in Swagger UI.
Accounts registered through `POST /api/auth/register` are always `USER`.

### Stopping

```bash
docker compose down      # stops and removes the containers, the data stays in the volume
docker compose down -v   # also deletes the database volume
```

The API handles `SIGTERM`: it stops accepting connections, lets requests in progress
finish and closes the database pool, so `docker compose down` takes about a second.

### Configuration

All settings come from `.env` (the template with comments is `.env.example`). Its values
work for local development as they are; change `POSTGRES_PASSWORD` and `JWT_SECRET`
(`openssl rand -hex 32`) anywhere else. `PORT` is the host port of the API (default 3000),
`POSTGRES_PORT` the host port of the database (default 5434).

## Development on the host

The API runs on the host, only the database in Docker. Requires Node.js 24 and pnpm.

```bash
pnpm install
pnpm db:up            # only the db container
pnpm migrate:latest
pnpm seed:run         # optional, same data as above
pnpm start            # http://localhost:3000
```

Stop the `api` container first (`docker compose stop api`) - both use port 3000.

## Tests

```bash
pnpm test:unit          # business rules on in-memory repositories, no database needed
pnpm test:integration   # HTTP API with Supertest on the test database
pnpm test               # both
```

Integration tests need PostgreSQL (`pnpm db:up`). They use a separate database, by
default `room_booking_test` (see `TEST_DATABASE_URL` in `.env.example`), which is dropped
and recreated on every run - never the development one.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and
on every pull request, in two parallel jobs:

- **Tests** - PostgreSQL 16 as a service container (started with a health check), then
  checkout, Node.js 24 with the pnpm store cache, `pnpm install --frozen-lockfile` and
  `pnpm test` (unit and integration tests).
- **Docker image builds** - `docker build .` with the same `Dockerfile` as Compose.

The workflow contains no secrets: the CI database accepts connections without a password
(it exists only for the duration of the job), and the integration tests set their own
JWT secret. The badge at the top shows the status of the latest run on `main`.
