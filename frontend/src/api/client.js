import { enqueue } from "../offlineQueue.js";

const baseUrl = "/api";

export class OfflineQueuedError extends Error {
  constructor(method, url) {
    super(`Offline: ${method} ${url} queued for later sync`);
    this.name = "OfflineQueuedError";
    this.queued = true;
  }
}

const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// These endpoints are interactive/ephemeral and must not be queued
const NON_QUEUEABLE = ["/api/chat", "/api/email"];

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const url = `${baseUrl}${path}`;
  const fullUrl = url;

  const isMutation = MUTATIONS.has(method);
  const isQueueable = isMutation && !NON_QUEUEABLE.some((prefix) => url.startsWith(prefix));

  // If offline before even attempting — queue mutations immediately
  if (isQueueable && !navigator.onLine) {
    const body = options.body ? JSON.parse(options.body) : undefined;
    enqueue(method, fullUrl, body);
    throw new OfflineQueuedError(method, fullUrl);
  }

  try {
    const response = await fetch(url, {
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
  } catch (err) {
    // Don't re-wrap an already-queued error
    if (err instanceof OfflineQueuedError) throw err;

    // Network failure mid-flight for a queueable mutation → queue it
    if (isQueueable && !navigator.onLine) {
      const body = options.body ? JSON.parse(options.body) : undefined;
      enqueue(method, fullUrl, body);
      throw new OfflineQueuedError(method, fullUrl);
    }

    throw err;
  }
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

export async function fetchHabits(date) {
  return request(`/habits?date=${encodeURIComponent(date)}`);
}

export async function fetchAllHabits() {
  return request("/habits/all");
}

export async function createHabit(payload) {
  return request("/habits", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateHabit(id, payload) {
  return request(`/habits/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteHabit(id) {
  return request(`/habits/${id}`, { method: "DELETE" });
}

export async function toggleHabitCompletion(id, date) {
  return request(`/habits/${id}/toggle`, { method: "POST", body: JSON.stringify({ date }) });
}

export async function reorderTasks(ids) {
  return request("/tasks/reorder", {
    method: "PATCH",
    body: JSON.stringify({ ids })
  });
}

export async function sendChatMessage(messages, date) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ messages, date })
  });
}

export async function executeAction(action) {
  const { type, params } = action;
  switch (type) {
    case "add_task":           return createTask(params);
    case "add_event":          return createEvent(params);
    case "add_shopping_item":  return createShoppingItem(params);
    case "add_goal":           return createGoal(params);
    case "add_long_term_todo": return createLongTermTodo(params);
    default: throw new Error(`Unknown action type: ${type}`);
  }
}
