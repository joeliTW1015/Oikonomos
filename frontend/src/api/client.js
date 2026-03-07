const baseUrl = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function fetchTasks(month) {
  return request(`/tasks?month=${encodeURIComponent(month)}`);
}

export async function fetchTaskHistory(id) {
  return request(`/tasks/${id}/history`);
}

export async function createTask(payload) {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateTask(id, payload) {
  return request(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, {
    method: "DELETE"
  });
}

export async function fetchTags() {
  return request("/tags");
}

export async function fetchEvents(month) {
  return request(`/events?month=${encodeURIComponent(month)}`);
}

export async function createEvent(payload) {
  return request("/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateEvent(id, payload) {
  return request(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchGoals() {
  return request("/goals");
}

export async function createGoal(payload) {
  return request("/goals", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateGoal(id, payload) {
  return request(`/goals/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteGoal(id) {
  return request(`/goals/${id}`, { method: "DELETE" });
}

export async function fetchShoppingItems() {
  return request("/shopping");
}

export async function createShoppingItem(payload) {
  return request("/shopping", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateShoppingItem(id, payload) {
  return request(`/shopping/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteShoppingItem(id) {
  return request(`/shopping/${id}`, { method: "DELETE" });
}

export async function deleteEvent(id) {
  return request(`/events/${id}`, {
    method: "DELETE"
  });
}

export async function fetchLongTermTodos() {
  return request("/long-term-todos");
}

export async function createLongTermTodo(payload) {
  return request("/long-term-todos", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateLongTermTodo(id, payload) {
  return request(`/long-term-todos/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteLongTermTodo(id) {
  return request(`/long-term-todos/${id}`, { method: "DELETE" });
}

export async function sendChatMessage(messages, date) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ messages, date })
  });
}
