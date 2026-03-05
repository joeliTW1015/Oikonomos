const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  const cleaned = tags
    .map((tag) => String(tag).trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(cleaned));
}

async function ensureTags(tagNames) {
  const names = normalizeTags(tagNames);
  const tagIds = [];

  for (const name of names) {
    await run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [name]);
    const row = await get("SELECT id FROM tags WHERE name = ?", [name]);
    if (row && row.id) {
      tagIds.push(row.id);
    }
  }

  return tagIds;
}

function rowsToTasks(rows) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    completed: Boolean(row.completed),
    tags: row.tags ? row.tags.split("|") : []
  }));
}

router.get("/", async (req, res, next) => {
  try {
    const { month, date } = req.query;

    if (!month && !date) {
      res.status(400).json({ error: "month or date is required" });
      return;
    }

    let rows = [];

    if (date) {
      rows = await all(
        "SELECT t.id, t.title, t.date, t.completed, GROUP_CONCAT(tags.name, '|') AS tags " +
          "FROM tasks t " +
          "LEFT JOIN task_tags tt ON tt.task_id = t.id " +
          "LEFT JOIN tags ON tags.id = tt.tag_id " +
          "WHERE t.date = ? " +
          "GROUP BY t.id " +
          "ORDER BY t.date, t.id",
        [date]
      );
    } else {
      const [yearStr, monthStr] = String(month).split("-");
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;

      if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
        res.status(400).json({ error: "month must be YYYY-MM" });
        return;
      }

      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 1);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      rows = await all(
        "SELECT t.id, t.title, t.date, t.completed, GROUP_CONCAT(tags.name, '|') AS tags " +
          "FROM tasks t " +
          "LEFT JOIN task_tags tt ON tt.task_id = t.id " +
          "LEFT JOIN tags ON tags.id = tt.tag_id " +
          "WHERE t.date >= ? AND t.date < ? " +
          "GROUP BY t.id " +
          "ORDER BY t.date, t.id",
        [startStr, endStr]
      );
    }

    res.json(rowsToTasks(rows));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, date, tags } = req.body;

    if (!title || !date) {
      res.status(400).json({ error: "title and date are required" });
      return;
    }

    const result = await run(
      "INSERT INTO tasks (title, date, completed) VALUES (?, ?, 0)",
      [String(title).trim(), String(date)]
    );

    const tagIds = await ensureTags(tags);
    for (const tagId of tagIds) {
      await run("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", [
        result.lastID,
        tagId
      ]);
    }

    const row = await get(
      "SELECT t.id, t.title, t.date, t.completed, GROUP_CONCAT(tags.name, '|') AS tags " +
        "FROM tasks t " +
        "LEFT JOIN task_tags tt ON tt.task_id = t.id " +
        "LEFT JOIN tags ON tags.id = tt.tag_id " +
        "WHERE t.id = ? " +
        "GROUP BY t.id",
      [result.lastID]
    );

    res.status(201).json(rowsToTasks([row])[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const { title, date, completed, tags } = req.body;

    if (!Number.isInteger(taskId)) {
      res.status(400).json({ error: "invalid task id" });
      return;
    }

    const existing = await get("SELECT id FROM tasks WHERE id = ?", [taskId]);
    if (!existing) {
      res.status(404).json({ error: "task not found" });
      return;
    }

    await run(
      "UPDATE tasks SET title = ?, date = ?, completed = ? WHERE id = ?",
      [
        String(title).trim(),
        String(date),
        completed ? 1 : 0,
        taskId
      ]
    );

    if (Array.isArray(tags)) {
      await run("DELETE FROM task_tags WHERE task_id = ?", [taskId]);
      const tagIds = await ensureTags(tags);
      for (const tagId of tagIds) {
        await run("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", [
          taskId,
          tagId
        ]);
      }
    }

    const row = await get(
      "SELECT t.id, t.title, t.date, t.completed, GROUP_CONCAT(tags.name, '|') AS tags " +
        "FROM tasks t " +
        "LEFT JOIN task_tags tt ON tt.task_id = t.id " +
        "LEFT JOIN tags ON tags.id = tt.tag_id " +
        "WHERE t.id = ? " +
        "GROUP BY t.id",
      [taskId]
    );

    res.json(rowsToTasks([row])[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId)) {
      res.status(400).json({ error: "invalid task id" });
      return;
    }

    await run("DELETE FROM task_tags WHERE task_id = ?", [taskId]);
    await run("DELETE FROM tasks WHERE id = ?", [taskId]);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
