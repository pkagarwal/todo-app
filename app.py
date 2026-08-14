import functools
import hmac
import os
import sqlite3
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

DB_PATH = Path(__file__).parent / "todo.db"

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY")
if not app.secret_key:
    app.secret_key = "dev-only-insecure-secret-key"
    print("WARNING: SECRET_KEY not set, using an insecure default. Set the SECRET_KEY env var in production.")

AUTH_USERNAME = os.environ.get("AUTH_USERNAME", "admin")
AUTH_PASSWORD_HASH = os.environ.get("AUTH_PASSWORD_HASH")
if not AUTH_PASSWORD_HASH:
    AUTH_PASSWORD_HASH = generate_password_hash("admin")
    print(
        "WARNING: AUTH_PASSWORD_HASH not set, defaulting to username 'admin' / password 'admin'. "
        "Generate a real hash with generate_password_hash('yourpassword') and set AUTH_USERNAME / "
        "AUTH_PASSWORD_HASH env vars in production."
    )


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                notes TEXT DEFAULT '',
                priority TEXT NOT NULL DEFAULT 'medium',
                due_date TEXT,
                done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (date('now'))
            )
            """
        )


PRIORITIES = ("low", "medium", "high")


@app.context_processor
def inject_today_display():
    return {"today_display": date.today().strftime("%A, %B %-d")}


def login_required(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)

    return wrapped


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if hmac.compare_digest(username, AUTH_USERNAME) and check_password_hash(
            AUTH_PASSWORD_HASH, password
        ):
            session["logged_in"] = True
            return redirect(request.args.get("next") or url_for("index"))
        error = "Invalid username or password."

    return render_template("login.html", error=error)


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
@login_required
def index():
    db = get_db()
    status = request.args.get("status", "all")
    priority = request.args.get("priority", "all")

    query = "SELECT * FROM tasks WHERE 1=1"
    params = []

    if status == "active":
        query += " AND done = 0"
    elif status == "done":
        query += " AND done = 1"

    if priority in PRIORITIES:
        query += " AND priority = ?"
        params.append(priority)

    query += """
        ORDER BY done ASC,
                 CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
                 (due_date IS NULL), due_date ASC,
                 id DESC
    """

    tasks = db.execute(query, params).fetchall()
    counts = db.execute(
        "SELECT COUNT(*) total, SUM(done) done FROM tasks"
    ).fetchone()

    return render_template(
        "index.html",
        tasks=tasks,
        status=status,
        priority=priority,
        priorities=PRIORITIES,
        total=counts["total"] or 0,
        done_count=counts["done"] or 0,
        today=date.today().isoformat(),
    )


@app.route("/add", methods=["POST"])
@login_required
def add_task():
    title = request.form.get("title", "").strip()
    notes = request.form.get("notes", "").strip()
    priority = request.form.get("priority", "medium")
    due_date = request.form.get("due_date") or None

    if priority not in PRIORITIES:
        priority = "medium"

    if title:
        db = get_db()
        db.execute(
            "INSERT INTO tasks (title, notes, priority, due_date) VALUES (?, ?, ?, ?)",
            (title, notes, priority, due_date),
        )
        db.commit()

    return redirect(url_for("index"))


@app.route("/toggle/<int:task_id>", methods=["POST"])
@login_required
def toggle_task(task_id):
    db = get_db()
    db.execute("UPDATE tasks SET done = 1 - done WHERE id = ?", (task_id,))
    db.commit()
    return redirect(request.referrer or url_for("index"))


@app.route("/delete/<int:task_id>", methods=["POST"])
@login_required
def delete_task(task_id):
    db = get_db()
    db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    return redirect(request.referrer or url_for("index"))


@app.route("/edit/<int:task_id>", methods=["GET", "POST"])
@login_required
def edit_task(task_id):
    db = get_db()

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        notes = request.form.get("notes", "").strip()
        priority = request.form.get("priority", "medium")
        due_date = request.form.get("due_date") or None

        if priority not in PRIORITIES:
            priority = "medium"

        if title:
            db.execute(
                "UPDATE tasks SET title = ?, notes = ?, priority = ?, due_date = ? WHERE id = ?",
                (title, notes, priority, due_date, task_id),
            )
            db.commit()
        return redirect(url_for("index"))

    task = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if task is None:
        return redirect(url_for("index"))
    return render_template("edit.html", task=task, priorities=PRIORITIES)


@app.route("/clear_done", methods=["POST"])
@login_required
def clear_done():
    db = get_db()
    db.execute("DELETE FROM tasks WHERE done = 1")
    db.commit()
    return redirect(url_for("index"))


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=int(os.environ.get("PORT", 5050)))
