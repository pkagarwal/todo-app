# Todo App (React)

A React port of the Flask todo app in `../Todo-Python-App`, built to the as-built spec in `../PRD.md`. Same screens, same behaviour, same styling.

- **Frontend**: React 18 + React Router 6, built with Vite (`src/`)
- **Backend**: Express + better-sqlite3 + express-session, JSON API (`server/`)
- **Tests**: Vitest + Supertest (`test/`)

## Setup

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and edit as needed.

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | insecure dev default (warns) | Session signing key. |
| `AUTH_USERNAME` | `admin` | Login username. |
| `AUTH_PASSWORD_HASH` | bcrypt hash of `admin` (warns) | Generate with `node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"`. |
| `API_PORT` | `5051` | Port the API server listens on. |

## Running (development)

```bash
npm run dev
```

Starts the API on `http://localhost:5051` and the Vite dev server on `http://localhost:5173` (which proxies `/api` to the API). Open `http://localhost:5173`. Default login: `admin` / `admin`.

`todo.db` (SQLite) is created next to `package.json` on first run.

## Running (production)

```bash
npm run build && npm start
```

Builds the SPA into `dist/` and serves it plus the API from a single Express process on `API_PORT`.

## Tests

```bash
npm test
```

## Project structure

```
server/app.js          Express app factory: session auth, tasks JSON API, SQLite
server/index.js        Loads .env, applies defaults/warnings, starts the server
src/main.jsx           Router and providers
src/auth.jsx           Auth context + RequireLogin guard (redirects to /login?next=...)
src/api.js             fetch wrapper for the JSON API
src/components/AppShell.jsx   Top bar (brand, date, Log out) + content wrapper
src/pages/LoginPage.jsx
src/pages/TaskListPage.jsx    Progress, add form, filters, task list, clear completed
src/pages/EditTaskPage.jsx
src/style.css          Copied verbatim from the Python app
test/app.test.js       API tests mirroring ../Todo-Python-App/test_app.py
```

## API

All routes except `/api/login` and `/api/session` return `401` without a session.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/login` | `{username, password}` → 204, or 401 `{error}` |
| POST | `/api/logout` | Clear session |
| GET | `/api/session` | `{logged_in}` |
| GET | `/api/tasks?status=&priority=` | `{tasks, total, done}` (filtered list, global counts) |
| POST | `/api/tasks` | Create (204 if title blank) |
| GET | `/api/tasks/:id` | One task (404 if missing) |
| PUT | `/api/tasks/:id` | Update (204 if title blank) |
| POST | `/api/tasks/:id/toggle` | Flip done |
| DELETE | `/api/tasks/:id` | Delete one |
| DELETE | `/api/tasks?done=true` | Delete all completed |
