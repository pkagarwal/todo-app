import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import bcrypt from "bcryptjs";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";

const TEST_USERNAME = "testuser";
const TEST_PASSWORD = "testpass";

let app, tmpDir, anon, client;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "todo-test-"));
  app = createApp({
    dbPath: path.join(tmpDir, "test.db"),
    secretKey: "test-secret",
    authUsername: TEST_USERNAME,
    authPasswordHash: bcrypt.hashSync(TEST_PASSWORD, 4),
  });
  anon = request.agent(app);
  client = request.agent(app);
  await client.post("/api/login").send({ username: TEST_USERNAME, password: TEST_PASSWORD });
});

afterEach(() => {
  app.db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("tasks", () => {
  it("shows empty state", async () => {
    const res = await client.get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [], total: 0, done: 0 });
  });

  it("added task appears in list", async () => {
    await client.post("/api/tasks").send({ title: "Buy milk", priority: "high" });
    const res = await client.get("/api/tasks");
    expect(res.body.tasks.map((t) => t.title)).toContain("Buy milk");
  });

  it("add task requires title", async () => {
    const res = await client.post("/api/tasks").send({ title: "  ", priority: "medium" });
    expect(res.status).toBe(204);
    expect((await client.get("/api/tasks")).body.total).toBe(0);
  });

  it("invalid priority defaults to medium", async () => {
    const res = await client.post("/api/tasks").send({ title: "X", priority: "urgent" });
    expect(res.body.priority).toBe("medium");
  });

  it("toggle marks task done", async () => {
    const { body: task } = await client.post("/api/tasks").send({ title: "Water plants", priority: "low" });
    await client.post(`/api/tasks/${task.id}/toggle`);
    const row = app.db.prepare("SELECT done FROM tasks WHERE id = ?").get(task.id);
    expect(row.done).toBe(1);
  });

  it("sorts done last, then priority, due date, newest first", async () => {
    await client.post("/api/tasks").send({ title: "low-undated", priority: "low" });
    await client.post("/api/tasks").send({ title: "high-later", priority: "high", due_date: "2030-02-01" });
    await client.post("/api/tasks").send({ title: "high-sooner", priority: "high", due_date: "2030-01-01" });
    const { body: doneTask } = await client.post("/api/tasks").send({ title: "done-high", priority: "high" });
    await client.post(`/api/tasks/${doneTask.id}/toggle`);
    await client.post("/api/tasks").send({ title: "medium-newest", priority: "medium" });
    const res = await client.get("/api/tasks");
    expect(res.body.tasks.map((t) => t.title)).toEqual([
      "high-sooner", "high-later", "medium-newest", "low-undated", "done-high",
    ]);
  });

  it("filters by status and priority, counts stay global", async () => {
    const { body: a } = await client.post("/api/tasks").send({ title: "A", priority: "high" });
    await client.post("/api/tasks").send({ title: "B", priority: "low" });
    await client.post(`/api/tasks/${a.id}/toggle`);
    const res = await client.get("/api/tasks?status=done&priority=high");
    expect(res.body.tasks.map((t) => t.title)).toEqual(["A"]);
    expect(res.body.total).toBe(2);
    expect(res.body.done).toBe(1);
  });

  it("clears completed tasks", async () => {
    const { body: a } = await client.post("/api/tasks").send({ title: "A" });
    await client.post("/api/tasks").send({ title: "B" });
    await client.post(`/api/tasks/${a.id}/toggle`);
    await client.delete("/api/tasks?done=true");
    const res = await client.get("/api/tasks");
    expect(res.body.tasks.map((t) => t.title)).toEqual(["B"]);
  });

  it("edit updates task; missing task is 404", async () => {
    const { body: a } = await client.post("/api/tasks").send({ title: "A" });
    const res = await client.put(`/api/tasks/${a.id}`).send({ title: "A2", notes: "n", priority: "low", due_date: "" });
    expect(res.body).toMatchObject({ title: "A2", notes: "n", priority: "low", due_date: null });
    expect((await client.get("/api/tasks/9999")).status).toBe(404);
  });
});

describe("auth", () => {
  it("tasks require login", async () => {
    const res = await anon.get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("correct credentials grant access", async () => {
    const res = await anon.post("/api/login").send({ username: TEST_USERNAME, password: TEST_PASSWORD });
    expect(res.status).toBe(204);
    expect((await anon.get("/api/tasks")).status).toBe(200);
  });

  it("wrong credentials are rejected", async () => {
    const res = await anon.post("/api/login").send({ username: TEST_USERNAME, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid username or password.");
    expect((await anon.get("/api/tasks")).status).toBe(401);
  });

  it("logout locks user out", async () => {
    expect((await client.post("/api/logout")).status).toBe(204);
    expect((await client.get("/api/tasks")).status).toBe(401);
  });
});
