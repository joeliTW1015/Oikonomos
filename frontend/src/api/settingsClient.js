const baseUrl = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function fetchSettings() {
  return request("/settings");
}

export async function saveSetting(key, value) {
  return request("/settings", {
    method: "PUT",
    body: JSON.stringify({ key, value }),
  });
}

export async function getGoogleAuthUrl() {
  return request("/auth/google/url");
}

export async function getGoogleStatus() {
  return request("/auth/google/status");
}

export async function disconnectGoogle() {
  return request("/auth/google", { method: "DELETE" });
}

export async function triggerSync() {
  return request("/sync/google", { method: "POST" });
}

export async function cleanupGoogleEvents() {
  return request("/sync/cleanup", { method: "POST" });
}

export async function deleteAllEvents() {
  return request("/events/all", { method: "DELETE" });
}

export async function analyseEmails() {
  return request("/email/analyse", { method: "POST" });
}

export async function testEmailConnection() {
  return request("/email/test-connection", { method: "POST" });
}
