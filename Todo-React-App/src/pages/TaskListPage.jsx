import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useTitle } from "../useTitle";

const PRIORITIES = ["low", "medium", "high"];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TaskListPage() {
  useTitle("My To-Do List");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const priority = searchParams.get("priority") ?? "all";

  const [data, setData] = useState({ tasks: [], total: 0, done: 0 });
  const [form, setForm] = useState({ title: "", notes: "", priority: "medium", due_date: "" });

  const load = useCallback(() => {
    api.listTasks(new URLSearchParams({ status, priority })).then(setData);
  }, [status, priority]);

  useEffect(load, [load]);

  const filterLink = (overrides) =>
    `/?${new URLSearchParams({ status, priority, ...overrides }).toString()}`;

  const handleAdd = async (e) => {
    e.preventDefault();
    await api.addTask(form);
    setForm({ title: "", notes: "", priority: "medium", due_date: "" });
    navigate("/");
    load();
  };

  const handleToggle = async (id) => {
    await api.toggleTask(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await api.deleteTask(id);
    load();
  };

  const handleClearDone = async (e) => {
    e.preventDefault();
    await api.clearDone();
    navigate("/");
    load();
  };

  const { tasks, total, done } = data;

  return (
    <>
      <header className="page-header">
        <h1>To-Do List</h1>
        {total > 0 ? (
          <div className="progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.round((done / total) * 100)}%` }}></div>
            </div>
            <p className="stats">{done} of {total} tasks done</p>
          </div>
        ) : (
          <p className="stats">Nothing on your list yet</p>
        )}
      </header>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          type="text"
          name="title"
          placeholder="What needs doing?"
          required
          autoFocus
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="add-form-row">
          <input
            type="text"
            name="notes"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <select name="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            name="due_date"
            min={todayIso()}
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <button type="submit">Add</button>
        </div>
      </form>

      <nav className="filters">
        <div className="filter-group">
          <Link className={status === "all" ? "active" : ""} to={filterLink({ status: "all" })}>All</Link>
          <Link className={status === "active" ? "active" : ""} to={filterLink({ status: "active" })}>Active</Link>
          <Link className={status === "done" ? "active" : ""} to={filterLink({ status: "done" })}>Done</Link>
        </div>
        <div className="filter-group">
          <Link className={priority === "all" ? "active" : ""} to={filterLink({ priority: "all" })}>Any priority</Link>
          {PRIORITIES.map((p) => (
            <Link key={p} className={priority === p ? "active" : ""} to={filterLink({ priority: p })}>{capitalize(p)}</Link>
          ))}
        </div>
      </nav>

      <ul className="task-list">
        {tasks.length === 0 ? (
          <li className="empty">Nothing here. Add a task above.</li>
        ) : (
          tasks.map((task) => (
            <li key={task.id} className={`task priority-${task.priority} ${task.done ? "done" : ""}`}>
              <form className="toggle-form" onSubmit={(e) => { e.preventDefault(); handleToggle(task.id); }}>
                <button type="submit" className="checkbox" aria-label="Toggle done">{task.done ? "✓" : ""}</button>
              </form>
              <div className="task-body">
                <div className="task-title">{task.title}</div>
                {task.notes && <div className="task-notes">{task.notes}</div>}
                <div className="task-meta">
                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  {task.due_date && <span className="due">Due {task.due_date}</span>}
                </div>
              </div>
              <div className="task-actions">
                <Link to={`/edit/${task.id}`}>Edit</Link>
                <form onSubmit={(e) => { e.preventDefault(); handleDelete(task.id); }}>
                  <button type="submit" className="link-btn">Delete</button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>

      {done > 0 && (
        <form className="clear-form" onSubmit={handleClearDone}>
          <button type="submit" className="link-btn">Clear completed</button>
        </form>
      )}
    </>
  );
}
