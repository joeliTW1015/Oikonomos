const express = require("express");
const { all } = require("../db");
const { MODEL, SYSTEM_PROMPT, buildContextBlock } = require("../prompts");

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

router.post("/", async (req, res) => {
  try {
    const { messages = [], date } = req.body;
    const today = date || new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    // Fetch tasks for month
    const tasks = await all(
      "SELECT id, title, date, status, note, description FROM tasks WHERE date LIKE ? ORDER BY date",
      [`${month}%`]
    );

    // Fetch tags per task
    if (tasks.length > 0) {
      const ids = tasks.map((t) => t.id);
      const placeholders = ids.map(() => "?").join(",");
      const tagRows = await all(
        `SELECT t.task_id, tg.name FROM task_tags t JOIN tags tg ON t.tag_id = tg.id WHERE t.task_id IN (${placeholders})`,
        ids
      );
      const tagsByTask = {};
      for (const row of tagRows) {
        if (!tagsByTask[row.task_id]) tagsByTask[row.task_id] = [];
        tagsByTask[row.task_id].push(row.name);
      }
      for (const task of tasks) {
        task.tags = tagsByTask[task.id] || [];
      }
    }

    // Fetch other data in parallel
    const [events, goals, shoppingItems, longTermTodos] = await Promise.all([
      all("SELECT date, title, time FROM events WHERE date LIKE ? ORDER BY date", [`${month}%`]),
      all("SELECT title, done FROM goals ORDER BY done, id"),
      all("SELECT name, type, done FROM shopping_items ORDER BY type, done, id"),
      all("SELECT title, done FROM long_term_todos ORDER BY done, id"),
    ]);

    const contextBlock = buildContextBlock({ tasks, events, goals, shoppingItems, longTermTodos }, today);
    const systemContent = `${SYSTEM_PROMPT}\n\n${contextBlock}`;

    const ollamaBody = {
      model: MODEL,
      stream: false,
      messages: [{ role: "system", content: systemContent }, ...messages],
    };

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ollamaBody),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      console.error("Ollama error:", text);
      return res.status(502).json({ error: "Ollama request failed", detail: text });
    }

    const data = await ollamaRes.json();
    res.json({ reply: data.message.content });
  } catch (err) {
    console.error("Chat route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
