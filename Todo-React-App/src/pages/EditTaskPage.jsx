import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useTitle } from "../useTitle";

const PRIORITIES = ["low", "medium", "high"];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function EditTaskPage() {
  useTitle("Edit Task");
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);

  useEffect(() => {
    api
      .getTask(id)
      .then((task) =>
        setForm({ title: task.title, notes: task.notes, priority: task.priority, due_date: task.due_date || "" })
      )
      .catch(() => navigate("/", { replace: true }));
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.updateTask(id, form);
    navigate("/");
  };

  if (!form) return null;

  return (
    <>
      <header>
        <h1>Edit Task</h1>
      </header>

      <form className="edit-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input type="text" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <label>
          Notes
          <textarea name="notes" rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <label>
          Priority
          <select name="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{capitalize(p)}</option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input type="date" name="due_date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </label>
        <div className="edit-actions">
          <button type="submit">Save</button>
          <Link to="/" className="cancel-link">Cancel</Link>
        </div>
      </form>
    </>
  );
}
