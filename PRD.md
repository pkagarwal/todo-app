# PRD: Todo App

## Summary

A single-user, password-protected web app for tracking personal tasks: create, prioritize, schedule, complete, and clear to-dos through a simple browser UI.

## Problem / Goal

Provide a lightweight, self-hosted to-do list for one person, with just enough structure (priority, due date, notes) to organize a daily task list, and a login gate so it's not open to the public internet.

## Target user

A single owner/operator running the app for their own use (e.g. self-hosted on a home server or small VPS). Not designed for multiple accounts or teams.

## Scope

### In scope (current functionality)

- **Authentication**: single hardcoded username/password login, session-based, gates every task-related page.
- **Task creation**: title (required), notes (optional), priority (`low`/`medium`/`high`, default `medium`), due date (optional).
- **Task list view**: shows all tasks, sorted by done-state, then priority (high → low), then due date (soonest first, undated last), then newest first.
- **Filtering**: filter the list by status (`all`/`active`/`done`) and by priority.
- **Task completion**: toggle a task done/not-done.
- **Task editing**: update title, notes, priority, due date.
- **Task deletion**: delete a single task.
- **Bulk clear**: delete all completed tasks in one action.
- **Task counts**: display total task count and completed count.

### Out of scope

- Multi-user accounts, registration, or per-user data isolation.
- Password reset / account recovery flow.
- Task sharing, assignment, or collaboration.
- Recurring tasks, reminders, or notifications.
- Tags/labels/categories beyond priority.
- Mobile app or offline support.
- Public API.

## Functional requirements

| ID | Requirement |
|---|---|
| FR1 | User must log in with a username and password before accessing any task data. |
| FR2 | Invalid login attempts show an error and do not create a session. |
| FR3 | Logging out ends the session and blocks further access until re-login. |
| FR4 | User can add a task with a required title and optional notes, priority, and due date. |
| FR5 | Submitting an add/edit form with a blank title does not create/update a task. |
| FR6 | An invalid priority value defaults to `medium` rather than rejecting the request. |
| FR7 | User can view all tasks, filtered by status and/or priority via URL query parameters. |
| FR8 | Task list is sorted: incomplete before complete, then by priority (high first), then by due date (soonest first, no date last), then most recently created first. |
| FR9 | User can toggle a task's done state from the list view. |
| FR10 | User can edit an existing task's title, notes, priority, and due date. |
| FR11 | User can delete an individual task. |
| FR12 | User can delete all completed tasks in one action. |
| FR13 | List view shows total task count and completed task count. |

## Non-functional requirements

- **Security**: passwords are hashed (never stored/compared in plaintext); login comparisons are timing-safe; session secret and credentials must be set via environment variables in production (insecure defaults only for local dev, with a startup warning).
- **Data persistence**: tasks are stored in a local SQLite database file, persisted across restarts.
- **Simplicity**: no build step or frontend framework — server-rendered HTML templates, minimal CSS.
- **Portability**: runs anywhere Python 3 + pip is available; configuration via environment variables / `.env`.

## Data model

Single `tasks` entity: `id`, `title`, `notes`, `priority` (`low`/`medium`/`high`), `due_date`, `done` (boolean), `created_at`.

## Success criteria

- A user can log in, add a task, see it appear correctly sorted and filterable, mark it done, edit it, and delete it — all without errors.
- Unauthenticated requests to any task route are redirected to login.
- Existing automated test suite (`pytest`) passes.

## Open questions / future considerations

- Multi-user support would require a user table, per-user task scoping, and a registration/admin flow — not currently planned.
- No current requirement for reminders, recurring tasks, or notifications, but these are natural next asks if the app grows beyond personal use.
