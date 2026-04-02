const QUEUE_KEY = "oikonomos_offline_queue";

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(method, url, body) {
  const queue = loadQueue();
  const entry = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, method, url, body, enqueuedAt: Date.now() };
  queue.push(entry);
  saveQueue(queue);
  return entry.id;
}

export async function flushQueue() {
  const queue = loadQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  for (const entry of queue) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: { "Content-Type": "application/json" },
        body: entry.body != null ? JSON.stringify(entry.body) : undefined,
      });
      if (!response.ok) {
        // Stop replaying on server error to preserve ordering
        break;
      }
      // Remove this entry from the queue
      const remaining = loadQueue().filter((e) => e.id !== entry.id);
      saveQueue(remaining);
      flushed++;
    } catch {
      // Network error — stop, will retry next time online
      break;
    }
  }

  const remaining = loadQueue().length;
  return { flushed, remaining };
}

export function getQueue() {
  return loadQueue();
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}
