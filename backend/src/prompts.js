const MODEL = "gemma3:12b";

const SYSTEM_PROMPT = `You are Oikonomos AI, a helpful personal assistant integrated into the Oikonomos planner app. You have access to the user's current tasks, events, goals, shopping list, and long-term todos.

Answer questions concisely and helpfully. When listing items, be brief. If asked about something not in the context, say so honestly. Do not make up data.`;

function formatTime(time) {
  if (!time) return "";
  // Convert 24h "HH:MM" to 12h "H:MM AM/PM"
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return ` ${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function buildContextBlock(data, date) {
  const { tasks, events, goals, shoppingItems, longTermTodos } = data;

  const lines = [];
  lines.push(`Today is ${date}.`);
  lines.push("");

  // Tasks
  lines.push("## Tasks this month");
  if (tasks.length === 0) {
    lines.push("(none)");
  } else {
    for (const t of tasks) {
      const status = t.status || "pending";
      const tags = t.tags && t.tags.length > 0 ? ` [${t.tags.join(", ")}]` : "";
      lines.push(`[${status}] ${t.date}: ${t.title}${tags}`);
    }
  }
  lines.push("");

  // Events
  lines.push("## Events this month");
  if (events.length === 0) {
    lines.push("(none)");
  } else {
    for (const e of events) {
      lines.push(`${e.date}${formatTime(e.time)}: ${e.title}`);
    }
  }
  lines.push("");

  // Goals
  lines.push("## Current Goals");
  if (goals.length === 0) {
    lines.push("(none)");
  } else {
    for (const g of goals) {
      lines.push(`[${g.done ? "x" : " "}] ${g.title}`);
    }
  }
  lines.push("");

  // Shopping
  lines.push("## Shopping List");
  const needed = shoppingItems.filter((i) => i.type === "needed" && !i.done).map((i) => i.name);
  const wanted = shoppingItems.filter((i) => i.type === "wanted" && !i.done).map((i) => i.name);
  const gotNeeded = shoppingItems.filter((i) => i.type === "needed" && i.done).map((i) => i.name);
  const gotWanted = shoppingItems.filter((i) => i.type === "wanted" && i.done).map((i) => i.name);
  if (needed.length > 0) lines.push(`Needed: ${needed.join(", ")}`);
  if (wanted.length > 0) lines.push(`Wanted: ${wanted.join(", ")}`);
  if (gotNeeded.length > 0) lines.push(`Got (needed): ${gotNeeded.join(", ")}`);
  if (gotWanted.length > 0) lines.push(`Got (wanted): ${gotWanted.join(", ")}`);
  if (shoppingItems.length === 0) lines.push("(none)");
  lines.push("");

  // Long-term todos
  lines.push("## Long-term Todos");
  if (longTermTodos.length === 0) {
    lines.push("(none)");
  } else {
    for (const t of longTermTodos) {
      lines.push(`[${t.done ? "x" : " "}] ${t.title}`);
    }
  }

  return lines.join("\n");
}

module.exports = { MODEL, SYSTEM_PROMPT, buildContextBlock };
