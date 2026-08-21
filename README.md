# Todo App

A small single-user, login-protected to-do list built with Flask and SQLite.

## Features

- Add, edit, delete, and toggle tasks (title, notes, priority, due date)
- Filter tasks by status (`all` / `active` / `done`) and priority (`low` / `medium` / `high`)
- Clear all completed tasks at once
- Single-user login (username/password) required for all task routes

## Requirements

- Python 3
- pip

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
```

(`requirements-dev.txt` pulls in `requirements.txt` plus `pytest` for running tests. Use `pip install -r requirements.txt` alone if you only want to run the app.)

## Configuration

The app reads config from environment variables (loaded automatically from a `.env` file via `python-dotenv`).

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | insecure dev default | Flask session signing key. Must be set to a random value in production. |
| `AUTH_USERNAME` | `admin` | Login username. |
| `AUTH_PASSWORD_HASH` | hash of `admin` | Werkzeug password hash for login. Generate one with `generate_password_hash('yourpassword')`. |
| `PORT` | `5050` | Port the dev server listens on. |

If `SECRET_KEY` or `AUTH_PASSWORD_HASH` aren't set, the app falls back to insecure defaults and prints a warning at startup — fine for local dev, not for production.

## Running

```bash
python app.py
```

This creates `todo.db` (SQLite, in the project root) if it doesn't exist, and starts the Flask dev server at `http://localhost:5050`.

Log in with `AUTH_USERNAME` / the password matching `AUTH_PASSWORD_HASH` (default `admin` / `admin`).

## Running tests

```bash
pytest
```

Tests use a temporary SQLite database (via `monkeypatch`) and a separate test username/password, so they don't touch `todo.db` or the real credentials.

## Project structure

```
app.py               Flask app: routes, auth, DB access
templates/
  base.html           Shared layout
  login.html           Login form
  index.html            Task list, filters, add-task form
  edit.html              Edit-task form
static/style.css     Styling
test_app.py           Pytest suite (auth + task routes)
todo.db               SQLite database (created at runtime, gitignored)
```

## Data model

Single `tasks` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Autoincrement |
| `title` | TEXT | Required |
| `notes` | TEXT | Optional, defaults to `''` |
| `priority` | TEXT | `low` / `medium` / `high`, defaults to `medium` |
| `due_date` | TEXT | Optional ISO date string |
| `done` | INTEGER | 0 or 1 |
| `created_at` | TEXT | Defaults to today's date |

## Routes

All routes below `/login` require an active session (enforced by the `login_required` decorator) and redirect to `/login` otherwise.

| Route | Methods | Purpose |
|---|---|---|
| `/login` | GET, POST | Show login form / authenticate |
| `/logout` | POST | Clear session |
| `/` | GET | List tasks, supports `?status=` and `?priority=` query filters |
| `/add` | POST | Create a task |
| `/toggle/<task_id>` | POST | Toggle a task's done state |
| `/edit/<task_id>` | GET, POST | Show / submit edit form for a task |
| `/delete/<task_id>` | POST | Delete a task |
| `/clear_done` | POST | Delete all completed tasks |

## Request workflow

**Startup**

1. `load_dotenv()` reads `.env` into the environment.
2. `SECRET_KEY`, `AUTH_USERNAME`, `AUTH_PASSWORD_HASH` are read from the environment (with warned-about fallbacks if missing).
3. `if __name__ == "__main__"` calls `init_db()` to ensure the `tasks` table exists, then `app.run()` starts the dev server.

**Every request**

1. Flask opens an app context; `get_db()` lazily opens a SQLite connection on first use per-request and stores it on `g`.
2. If the route is decorated with `login_required` and `session["logged_in"]` isn't set, the user is redirected to `/login?next=<original path>` before the view body runs.
3. The view runs, reads/writes the `tasks` table, and returns a rendered template or a redirect.
4. `close_db()` runs as a `teardown_appcontext` hook, closing the per-request DB connection regardless of success or error.

**Auth flow**

1. GET `/login` renders the login form.
2. POST `/login` compares submitted credentials against `AUTH_USERNAME` / `AUTH_PASSWORD_HASH` using timing-safe comparisons. On success, `session["logged_in"] = True` and the user is redirected to `next` (or `/`). On failure, the form re-renders with an error.
3. POST `/logout` clears the session, ending the login.

**Task CRUD flow**

- `/` reads `status`/`priority` query params, builds a filtered/sorted SQL query, and renders `index.html` with the task list and counts.
- `/add` validates `title` is non-empty and `priority` is one of `PRIORITIES` (defaulting to `medium` otherwise), inserts a row, and redirects back to `/`.
- `/edit/<id>` on GET loads the task and renders `edit.html`; on POST it re-validates and updates the row, then redirects to `/`.
- `/toggle/<id>` flips `done` (`1 - done`) and redirects back to the referring page.
- `/delete/<id>` removes the row and redirects back to the referring page.
- `/clear_done` bulk-deletes all rows where `done = 1`.

## Function reference (`app.py`)

| Function | Type | Description |
|---|---|---|
| `get_db()` | helper | Returns the current request's SQLite connection, creating and caching it on `flask.g` if it doesn't exist yet. Sets `row_factory` to `sqlite3.Row` (dict-like row access) and enables foreign keys. |
| `close_db(exception=None)` | teardown hook | Registered via `@app.teardown_appcontext`. Pops the DB connection off `g` and closes it at the end of each request. |
| `init_db()` | helper | Opens a direct SQLite connection (not through `get_db()`/`g`) and runs `CREATE TABLE IF NOT EXISTS tasks (...)`. Called once at startup, and also by tests to set up a temp database. |
| `inject_today_display()` | context processor | Registered via `@app.context_processor`. Adds `today_display` (e.g. `"Friday, August 21"`) to every template's context. |
| `login_required(view)` | decorator | Wraps a view so it checks `session.get("logged_in")` first; redirects to `/login?next=<path>` if not authenticated, otherwise calls the wrapped view. |
| `login()` | view — `/login` (GET, POST) | GET: renders the login form. POST: validates `username`/`password` from the form against `AUTH_USERNAME`/`AUTH_PASSWORD_HASH` using `hmac.compare_digest` and `check_password_hash`; on success sets `session["logged_in"]` and redirects to `next` or `/`, on failure re-renders the form with an error message. |
| `logout()` | view — `/logout` (POST) | Clears the entire session and redirects to `/login`. |
| `index()` | view — `/` (GET) | Reads `status` and `priority` query params, builds a dynamic SQL query (filtering by done-state and priority, sorting by done, priority rank, due date, then id), fetches tasks plus total/done counts, and renders `index.html`. |
| `add_task()` | view — `/add` (POST) | Reads `title`, `notes`, `priority`, `due_date` from the form; trims `title`/`notes`; falls back to `medium` for an invalid priority; if `title` is non-empty, inserts a new row and commits. Always redirects to `/`. |
| `toggle_task(task_id)` | view — `/toggle/<int:task_id>` (POST) | Flips the `done` flag for the given task (`done = 1 - done`) and commits. Redirects to `request.referrer` if present, else `/`. |
| `delete_task(task_id)` | view — `/delete/<int:task_id>` (POST) | Deletes the task with the given id and commits. Redirects to `request.referrer` if present, else `/`. |
| `edit_task(task_id)` | view — `/edit/<int:task_id>` (GET, POST) | POST: validates and updates title/notes/priority/due_date for the task, then redirects to `/`. GET: loads the task (redirecting to `/` if it doesn't exist) and renders `edit.html`. |
| `clear_done()` | view — `/clear_done` (POST) | Deletes all rows where `done = 1` and commits. Redirects to `/`. |

## Security notes

- Login uses `hmac.compare_digest` for the username check and `werkzeug.security.check_password_hash` for the password — both timing-safe.
- This is a single hardcoded-credential login, not a multi-user auth system — there's no user table or registration flow.
- `.env` (containing real secrets) and `todo.db` are gitignored; don't commit them.
