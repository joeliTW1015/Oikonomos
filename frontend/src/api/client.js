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
