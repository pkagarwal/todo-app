async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  session: () => request("GET", "/api/session"),
  login: (username, password) => request("POST", "/api/login", { username, password }),
  logout: () => request("POST", "/api/logout"),
  listTasks: (params) => request("GET", `/api/tasks?${params.toString()}`),
  getTask: (id) => request("GET", `/api/tasks/${id}`),
  addTask: (task) => request("POST", "/api/tasks", task),
  updateTask: (id, task) => request("PUT", `/api/tasks/${id}`, task),
  toggleTask: (id) => request("POST", `/api/tasks/${id}/toggle`),
  deleteTask: (id) => request("DELETE", `/api/tasks/${id}`),
  clearDone: () => request("DELETE", "/api/tasks?done=true"),
};
