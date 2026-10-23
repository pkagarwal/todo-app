# PRD: Todo App (As-Built Specification)

## Summary

A single-user, password-protected web app for tracking personal tasks: create, prioritize, schedule, complete, and clear to-dos through a simple browser UI.

This document describes the application **as built** in `Todo-Python-App/` (Flask + Jinja templates + SQLite) in framework-neutral terms, so that the same application can be re-implemented with a **React** or **Vue** frontend and behave identically. Where the Python implementation makes an incidental choice (e.g. a redirect target), it is recorded here so ports can match it.

## Problem / Goal

Provide a lightweight, self-hosted to-do list for one person, with just enough structure (priority, due date, notes) to organize a daily task list, and a login gate so it's not open to the public internet.

## Target user

A single owner/operator running the app for their own use (e.g. self-hosted on a home server or small VPS). Not designed for multiple accounts or teams.

## Scope

### In scope (current functionality)

- **Authentication**: single username/password (configured via environment), session-based, gates every task-related screen and operation.
- **Task creation**: title (required), notes (optional), priority (`low`/`medium`/`high`, default `medium`), due date (optional).
- **Task list view**: shows tasks sorted by done-state, then priority (high → low), then due date (soonest first, undated last), then newest first.
- **Filtering**: filter the list by status (`all`/`active`/`done`) and by priority (`all`/`low`/`medium`/`high`), reflected in the URL.
- **Task completion**: toggle a task done/not-done.
- **Task editing**: update title, notes, priority, due date on a separate edit screen.
- **Task deletion**: delete a single task (with a browser confirm dialog).
- **Bulk clear**: delete all completed tasks in one action.
- **Progress**: show "N of M tasks done" with a progress bar.

### Out of scope

- Multi-user accounts, registration, or per-user data isolation.
- Password reset / account recovery flow.
- Task sharing, assignment, or collaboration.
- Recurring tasks, reminders, or notifications.
- Tags/labels/categories beyond priority.
- Native mobile app or offline support.
- Public API beyond what the frontend itself needs.

## Functional requirements

| ID | Requirement |
|---|---|
| FR1 | User must log in with a username and password before accessing any task data or screen. |
| FR2 | Invalid login attempts show the error "Invalid username or password." and do not create a session. |
| FR3 | Logging out ends the session and blocks further access until re-login. |
| FR4 | User can add a task with a required title and optional notes, priority, and due date. |
| FR5 | Submitting an add/edit form with a blank (whitespace-only) title does not create/update a task. |
| FR6 | An invalid priority value defaults to `medium` rather than rejecting the request. |
| FR7 | User can view tasks filtered by status and/or priority; the filters are carried in URL query parameters (`?status=`, `?priority=`) so they are bookmarkable and survive reload. |
| FR8 | Task list is sorted: incomplete before complete, then by priority (high first), then by due date (soonest first, no date last), then most recently created first. |
| FR9 | User can toggle a task's done state from the list view; the current filters are preserved afterwards. |
| FR10 | User can edit an existing task's title, notes, priority, and due date on a dedicated edit screen. |
| FR11 | User can delete an individual task from the list view after confirming; the current filters are preserved afterwards. |
| FR12 | User can delete all completed tasks in one action ("Clear completed"), offered only when at least one task is done. |
| FR13 | List view shows total task count and completed task count as "`done` of `total` tasks done" plus a progress bar; counts are **global**, not affected by the active filters. |
| FR14 | After adding a task, editing a task, or clearing completed tasks, the user is returned to the unfiltered list (`/`). |
| FR15 | Opening the edit screen for a task id that does not exist returns the user to the list. |

## Non-functional requirements

- **Security**: passwords are stored as a hash and never compared in plaintext; username and password comparisons are timing-safe; session secret and credentials come from environment variables in production (insecure defaults allowed only for local development, with a startup warning).
- **Data persistence**: tasks are stored in a local SQLite database file (`todo.db`), persisted across restarts. The table is created on startup if missing.
- **Portability**: configuration via environment variables / `.env` file.
- **Simplicity**: one data entity, three screens, no third-party UI libraries required.

## Data model

Single `tasks` entity:

| Field | Type | Rules |
|---|---|---|
| `id` | integer | Primary key, auto-increment. |
| `title` | string | Required, trimmed, non-empty. |
| `notes` | string | Optional, trimmed, defaults to `""`. |
| `priority` | enum `low` / `medium` / `high` | Defaults to `medium`; unknown values coerced to `medium`. |
| `due_date` | ISO date string `YYYY-MM-DD` or `null` | Empty string is stored as `null`. Not validated as a real date by the server. |
| `done` | boolean (stored as `0`/`1`) | Defaults to `false`. |
| `created_at` | ISO date string `YYYY-MM-DD` | Set by the database to today's date on insert. Not editable. |

Sort order (applied server-side, and to be reproduced identically by any client-side sort):

1. `done` ascending (not done first)
2. priority rank: `high` = 0, `medium` = 1, `low` = 2
3. `due_date IS NULL` ascending (dated tasks first), then `due_date` ascending
4. `id` descending (newest first)

## Screens

Every screen shares the same layout shell.

### Layout shell (all screens)

- Sticky top bar with:
  - Brand: a blue rounded square containing a ✓ mark, followed by the word **Tasklist**. Clicking it navigates to `/`.
  - Today's date, formatted `"<Weekday>, <Month> <day>"` with no leading zero (e.g. `Friday, August 21`).
  - A **Log out** link-style button, shown only when logged in. Submits a logout and returns to the login screen.
- Centered content column, max width 640px, with padding.
- HTML `<title>` defaults to `To-Do`; each screen overrides it (below).

### 1. Login screen — `/login`

- `<title>`: `Log In`. Heading: **Log In**.
- Form in a card: **Username** (text, required, autofocused) and **Password** (password, required); primary button **Log In**.
- On failure, the message `Invalid username or password.` is shown above the fields in muted text and the form stays on the login screen.
- On success, redirect to the `next` path (the page the user originally tried to open) if present, otherwise `/`.
- Unauthenticated access to any other screen redirects here with `?next=<original path>`.

### 2. Task list screen — `/`

- `<title>`: `My To-Do List`. Heading: **To-Do List**.
- **Progress block** under the heading:
  - If total tasks > 0: a thin rounded progress bar filled to `round(done / total * 100)` percent, then the text `<done> of <total> tasks done`.
  - If total tasks = 0: the text `Nothing on your list yet` (no bar).
- **Add form** (card):
  - Row 1: text input, placeholder `What needs doing?`, required, autofocused.
  - Row 2 (wrapping flex row): text input placeholder `Notes (optional)`; priority `<select>` with options Low / Medium / High, **Medium** preselected; date input with `min` = today (client-side hint only — the server accepts any value); primary button **Add**.
  - On submit: create the task, then return to `/` (filters reset, form cleared).
- **Filter bar** (two groups, left and right, small text; the active choice in each group is highlighted as a white pill with blue text):
  - Status: **All** / **Active** / **Done** → `?status=all|active|done`.
  - Priority: **Any priority** / **Low** / **Medium** / **High** → `?priority=all|low|medium|high`.
  - Choosing a value in one group keeps the other group's current value in the URL.
  - Defaults when a param is absent: `status=all`, `priority=all`. An unrecognised value applies no filter for that dimension (and highlights nothing in that group).
- **Task list** (vertical stack of cards, 8px gap). Each task card shows:
  - A 4px left border coloured by priority (green low / amber medium / red high).
  - A round toggle button (24px, circle outline). When done: filled blue with a white ✓. Clicking toggles `done` and keeps the current filters.
  - Body: **title** (bold), notes (muted, smaller, only if non-empty), then a meta row with a coloured pill badge showing the priority text (capitalised) and, if present, `Due <YYYY-MM-DD>` in muted text.
  - Right-aligned actions: **Edit** link → `/edit/<id>`; **Delete** link-style button that first asks `Delete this task?` via `window.confirm`, then deletes and keeps the current filters.
  - Done tasks render at 55% opacity with the title struck through.
- **Empty list**: when the (filtered) list has no tasks, show a dashed-border card with centred muted text `Nothing here. Add a task above.`
- **Clear completed**: a centred link-style button below the list, shown only when the global done count > 0. Deletes all done tasks and returns to `/`.

### 3. Edit screen — `/edit/<id>`

- `<title>`: `Edit Task`. Heading: **Edit Task**.
- Form in a card, labels above stacked full-width fields: **Title** (text, required), **Notes** (textarea, 3 rows), **Priority** (select Low/Medium/High, current value selected), **Due date** (date input, current value, no `min`).
- Actions: primary button **Save**, and a muted **Cancel** link → `/`.
- On Save: apply the same validation as add (trim title/notes; blank title → no change; invalid priority → `medium`; empty date → `null`), then return to `/` whether or not the update was applied.
- If the task id does not exist, navigate to `/` instead of rendering.

## Validation and coercion rules (server-side, must be enforced regardless of client)

| Field | Rule |
|---|---|
| `title` | Trim whitespace; if empty, silently ignore the create/update and still redirect to `/`. |
| `notes` | Trim whitespace; default `""`. |
| `priority` | Must be one of `low`, `medium`, `high`; otherwise `medium`. |
| `due_date` | Empty/missing → `null`; otherwise stored as given. |
| `status` filter | `active` → `done = false`; `done` → `done = true`; anything else → no filter. |
| `priority` filter | One of `low`/`medium`/`high` → filter; anything else → no filter. |

## Operations (backend contract)

The Python app exposes these as form-posting routes with redirects. A React/Vue port should expose the same operations as a JSON API (suggested shape on the right); semantics must match the left-hand column.

| As-built route | Behaviour | Suggested JSON API for SPA ports |
|---|---|---|
| `GET /login` | Render login form. | Client route `/login` (no server call). |
| `POST /login` (`username`, `password`, `?next=`) | Timing-safe check; on success set `logged_in` in the session and redirect to `next` or `/`; on failure re-render form with error (HTTP 200). | `POST /api/login` `{username, password}` → `204` + session cookie, or `401 {error: "Invalid username or password."}`. |
| `POST /logout` | Clear session; redirect to `/login`. | `POST /api/logout` → `204`. |
| `GET /` (`?status=`, `?priority=`) | Return filtered + sorted tasks plus global `total` and `done` counts. | `GET /api/tasks?status=&priority=` → `{tasks: [...], total, done}`. |
| `POST /add` (`title`, `notes`, `priority`, `due_date`) | Validate/coerce; insert if title non-empty; redirect to `/`. | `POST /api/tasks` → `201` task, or `204` if ignored for blank title. |
| `GET /edit/<id>` | Load one task; redirect to `/` if missing. | `GET /api/tasks/:id` → task or `404`. |
| `POST /edit/<id>` (same fields as add) | Validate/coerce; update if title non-empty; redirect to `/`. | `PUT /api/tasks/:id` → `200` task, or `204` if ignored. |
| `POST /toggle/<id>` | `done = NOT done`; redirect to the referring page (keeps filters). | `POST /api/tasks/:id/toggle` → `200` task. |
| `POST /delete/<id>` | Delete row; redirect to the referring page (keeps filters). | `DELETE /api/tasks/:id` → `204`. |
| `POST /clear_done` | Delete all rows where `done = true`; redirect to `/`. | `DELETE /api/tasks?done=true` → `204`. |

All operations except login require an authenticated session; the as-built app redirects to `/login?next=<path>` (a JSON API should return `401` and the SPA should route to `/login?next=<path>`).

Authentication is a signed session cookie; the only session field is `logged_in: true`. Deleting/toggling a non-existent id is a no-op (no error).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | insecure dev default (warns at startup) | Session signing key. |
| `AUTH_USERNAME` | `admin` | Login username. |
| `AUTH_PASSWORD_HASH` | hash of `admin` (warns at startup) | Password hash (Werkzeug format in the Python app; a port may use bcrypt/argon2 but must never store plaintext). |
| `PORT` | `5050` | Server port. |

Values are loaded from a `.env` file if present.

## Visual design tokens

Reproduce these so the React/Vue builds look the same as the Python build.

| Token | Value |
|---|---|
| Page background | `#f5f5f4` |
| Card background | `#ffffff` |
| Text | `#1c1917` |
| Muted text | `#78716c` |
| Border | `#e7e5e4` |
| Accent (buttons, links, progress, brand) | `#2563eb`; hover `#1d4ed8` |
| Priority low | `#10b981` |
| Priority medium | `#f59e0b` |
| Priority high | `#ef4444` |
| Card radius | `10px`; inputs/buttons `8px`; badges/progress `999px` |
| Shadows | small `0 1px 2px rgba(28,25,23,.04)`; hover `0 4px 14px rgba(28,25,23,.06)` |
| Font | system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) |
| Content width | `640px` max, centred, `32px 20px 80px` padding |

Other details: primary buttons are accent-filled with white bold text; secondary actions (Log out, Delete, Clear completed, Cancel) are underlined muted link-style buttons that turn red on hover; inputs get an accent border on focus; the task card shadow grows on hover; the progress bar animates width over 0.3s. The full stylesheet is in `Todo-Python-App/static/style.css` and can be reused verbatim.

## Guidance for React and Vue implementations

The behaviour above is the contract. The following structure keeps a port faithful without prescribing libraries.

**Architecture**

- SPA frontend (React with React Router, or Vue with Vue Router) served alongside a small JSON backend implementing the "Suggested JSON API" column. The existing Flask app can be adapted to serve JSON, or any equivalent backend can be used; SQLite and the `tasks` table stay as specified.
- Session-cookie auth as in the Python app (cookie-based, `credentials: "include"` on fetch). Tokens/JWT are not required.
- Sorting and count semantics are the server's responsibility; the client renders what it receives. If a port sorts client-side, it must reproduce the four-level sort exactly.

**Client routes**

| Route | Screen | Guard |
|---|---|---|
| `/login` | Login | Public; if already logged in, may redirect to `/`. |
| `/` | Task list | Requires session; otherwise redirect to `/login?next=/...` (include current query string). |
| `/edit/:id` | Edit task | Requires session; if the task is missing, redirect to `/`. |

**Suggested components** (same names work in both frameworks)

- `AppShell` / `TopBar` — brand, today's date, Log out.
- `LoginPage` — form + error message.
- `TaskListPage` — orchestrates fetching `{tasks, total, done}` from the URL's `status`/`priority` params and re-fetching after every mutation.
  - `ProgressHeader` — bar + "N of M tasks done" / "Nothing on your list yet".
  - `AddTaskForm` — resets to defaults (Medium, empty date) after a successful add and navigates to `/` (clearing filters).
  - `FilterBar` — links/buttons that update the query string, preserving the other dimension.
  - `TaskItem` — toggle, title/notes/meta, Edit link, Delete with `window.confirm("Delete this task?")`.
  - `EmptyState` — "Nothing here. Add a task above."
  - `ClearCompletedButton` — visible only when `done > 0`.
- `EditTaskPage` — loads the task by id, Save/Cancel.

**State**

- Filters live in the URL query string, not in component state, so reload/bookmark works (FR7).
- After toggle/delete: re-fetch with the current query string (FR9/FR11). After add/edit/clear: navigate to `/` (FR14).
- No global store is required; component-local state plus the router is sufficient.

**Behavioural parity checklist** (the port is done when all are true)

- [ ] Unauthenticated visit to `/` or `/edit/1` lands on `/login?next=...` and returns there after login.
- [ ] Wrong credentials show `Invalid username or password.` and no session is created.
- [ ] Log out blocks access until re-login.
- [ ] Whitespace-only title is ignored on add and edit.
- [ ] Invalid priority becomes `medium`.
- [ ] List order matches the four-level sort for mixed done/priority/due-date data.
- [ ] `?status=done&priority=high` filters correctly and both pills highlight; switching one filter keeps the other.
- [ ] Toggle and delete keep the current filters; add, edit and clear return to the unfiltered list.
- [ ] Progress text/bar use global counts even when a filter is active.
- [ ] "Clear completed" appears only when at least one task is done, and removes all done tasks.
- [ ] Empty states show the exact strings above.
- [ ] Top bar date renders as e.g. `Friday, August 21`.

## Success criteria

- A user can log in, add a task, see it appear correctly sorted and filterable, mark it done, edit it, and delete it — all without errors.
- Unauthenticated requests to any task route are redirected to login.
- The Python app's automated test suite (`pytest`, `Todo-Python-App/test_app.py`) passes; a React/Vue port ships an equivalent suite covering: empty state, add task appears, blank title ignored, toggle marks done, index requires login, correct login grants access, wrong login rejected, logout locks out.

## Open questions / future considerations

- Multi-user support would require a user table, per-user task scoping, and a registration/admin flow — not currently planned.
- No current requirement for reminders, recurring tasks, or notifications, but these are natural next asks if the app grows beyond personal use.
- The as-built app does not validate `due_date` format server-side and only hints `min=today` on the add form (not on edit). A port may tighten this, but it is not required for parity.
