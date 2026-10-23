import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import express from "express";
import session from "express-session";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRIORITIES = ["low", "medium", "high"];

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function initDb(dbPath) {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (date('now'))
    )
  `);
  return db;
}

function parseTaskInput(body) {
  const title = (body.title ?? "").trim();
  const notes = (body.notes ?? "").trim();
  let priority = body.priority ?? "medium";
  if (!PRIORITIES.includes(priority)) priority = "medium";
  const due_date = body.due_date ? body.due_date : null;
  return { title, notes, priority, due_date };
}

function rowToTask(row) {
  return row ? { ...row, done: Boolean(row.done) } : null;
}

export function createApp({ dbPath, secretKey, authUsername, authPasswordHash }) {
  const db = initDb(dbPath);
  const app = express();

  app.use(express.json());
  app.use(
    session({
      secret: secretKey,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax" },
    })
  );

  const loginRequired = (req, res, next) => {
    if (!req.session.logged_in) return res.status(401).json({ error: "Login required" });
    next();
  };

  app.post("/api/login", (req, res) => {
    const { username = "", password = "" } = req.body ?? {};
    if (timingSafeEqual(username, authUsername) && bcrypt.compareSync(password, authPasswordHash)) {
      req.session.logged_in = true;
      return res.status(204).end();
    }
    res.status(401).json({ error: "Invalid username or password." });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.status(204).end());
  });

  app.get("/api/session", (req, res) => {
    res.json({ logged_in: Boolean(req.session.logged_in) });
  });

  app.get("/api/tasks", loginRequired, (req, res) => {
    const status = req.query.status ?? "all";
    const priority = req.query.priority ?? "all";

    let query = "SELECT * FROM tasks WHERE 1=1";
    const params = [];
    if (status === "active") query += " AND done = 0";
    else if (status === "done") query += " AND done = 1";
    if (PRIORITIES.includes(priority)) {
      query += " AND priority = ?";
      params.push(priority);
    }
    query += `
      ORDER BY done ASC,
               CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
               (due_date IS NULL), due_date ASC,
               id DESC
    `;

    const tasks = db.prepare(query).all(...params).map(rowToTask);
    const counts = db.prepare("SELECT COUNT(*) total, SUM(done) done FROM tasks").get();
    res.json({ tasks, total: counts.total || 0, done: counts.done || 0 });
  });

  app.post("/api/tasks", loginRequired, (req, res) => {
    const { title, notes, priority, due_date } = parseTaskInput(req.body ?? {});
    if (!title) return res.status(204).end();
    const info = db
      .prepare("INSERT INTO tasks (title, notes, priority, due_date) VALUES (?, ?, ?, ?)")
      .run(title, notes, priority, due_date);
    res.status(201).json(rowToTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid)));
  });

  app.get("/api/tasks/:id", loginRequired, (req, res) => {
    const task = rowToTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id));
    if (!task) return res.status(404).json({ error: "Not found" });
    res.json(task);
  });

  app.put("/api/tasks/:id", loginRequired, (req, res) => {
    const { title, notes, priority, due_date } = parseTaskInput(req.body ?? {});
    if (!title) return res.status(204).end();
    db.prepare("UPDATE tasks SET title = ?, notes = ?, priority = ?, due_date = ? WHERE id = ?").run(
      title, notes, priority, due_date, req.params.id
    );
    res.json(rowToTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id)));
  });

  app.post("/api/tasks/:id/toggle", loginRequired, (req, res) => {
    db.prepare("UPDATE tasks SET done = 1 - done WHERE id = ?").run(req.params.id);
    res.json(rowToTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id)));
  });

  app.delete("/api/tasks/:id", loginRequired, (req, res) => {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  app.delete("/api/tasks", loginRequired, (req, res) => {
    if (req.query.done === "true") db.prepare("DELETE FROM tasks WHERE done = 1").run();
    res.status(204).end();
  });

  // Production: serve the built SPA from dist/
  if (process.env.NODE_ENV === "production") {
    const dist = path.join(__dirname, "..", "dist");
    app.use(express.static(dist));
    app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.db = db;
  return app;
}
