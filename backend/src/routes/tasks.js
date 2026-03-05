const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(
    tags.map((t) => String(t).trim()).filter((t) => t.length > 0)
  ));
}

async function ensureTags(tagNames) {
  const names = normalizeTags(tagNames);
  const tagIds = [];
  for (const name of names) {
    await run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [name]);
    const row = await get("SELECT id FROM tags WHERE name = ?", [name]);
    if (row && row.id) tagIds.push(row.id);
  }
  return tagIds;
}

function rowsToTasks(rows) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || null,
    date: row.date,
    status: row.status || "pending",
    note: row.note || null,
    postponeDate: row.postpone_date || null,
    originTaskId: row.origin_task_id || null,
    postponeCount: row.postpone_count || 0,
    tags: row.tags ? row.tags.split("|") : []
  }));
}

const BASE_SELECT =
  "SELECT t.id, t.title, t.description, t.date, t.status, t.note, " +
  "t.postpone_date, t.origin_task_id, t.postpone_count, " +
  "GROUP_CONCAT(tags.name, '|') AS tags " +
  "FROM tasks t " +
  "LEFT JOIN task_tags tt ON tt.task_id = t.id " +
  "LEFT JOIN tags ON tags.id = tt.tag_id ";

async function fetchTaskById(id) {
  const row = await get(BASE_SELECT + "WHERE t.id = ? GROUP BY t.id", [id]);
  return row ? rowsToTasks([row])[0] : null;
}

// GET / — tasks by month or date
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
        BASE_SELECT + "WHERE t.date = ? GROUP BY t.id ORDER BY t.date, t.id",
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
        BASE_SELECT + "WHERE t.date >= ? AND t.date < ? GROUP BY t.id ORDER BY t.date, t.id",
        [startStr, endStr]
      );
    }

    res.json(rowsToTasks(rows));
  } catch (err) {
    next(err);
  }
});

// GET /:id/history — full postponement chain for a task
router.get("/:id/history", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      res.status(400).json({ error: "invalid task id" });
      return;
    }

    const task = await get("SELECT id, origin_task_id FROM tasks WHERE id = ?", [taskId]);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }

    const rootId = task.origin_task_id || task.id;
    const rows = await all(
      BASE_SELECT +
        "WHERE (t.id = ? OR t.origin_task_id = ?) GROUP BY t.id ORDER BY t.postpone_count, t.id",
      [rootId, rootId]
    );

    res.json(rowsToTasks(rows));
  } catch (err) {
    next(err);
  }
});

// POST / — create task
router.post("/", async (req, res, next) => {
  try {
    const { title, date, description, tags } = req.body;

    if (!title || !date) {
      res.status(400).json({ error: "title and date are required" });
      return;
    }

    const result = await run(
      "INSERT INTO tasks (title, description, date, status, completed) VALUES (?, ?, ?, 'pending', 0)",
      [String(title).trim(), description ? String(description).trim() : null, String(date)]
    );

    const tagIds = await ensureTags(tags);
    for (const tagId of tagIds) {
      await run("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", [result.lastID, tagId]);
    }

    res.status(201).json(await fetchTaskById(result.lastID));
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update task; handles status changes and postponement
router.put("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      res.status(400).json({ error: "invalid task id" });
      return;
    }

    const existing = await get(
      "SELECT id, title, description, date, status, note, postpone_date, origin_task_id, postpone_count FROM tasks WHERE id = ?",
      [taskId]
    );
    if (!existing) {
      res.status(404).json({ error: "task not found" });
      return;
    }

    // Merge incoming fields with existing values so partial updates work
    const newTitle = req.body.title !== undefined ? String(req.body.title).trim() : existing.title;
    const newDescription = req.body.description !== undefined
      ? (req.body.description ? String(req.body.description).trim() : null)
      : existing.description;
    const newDate = req.body.date !== undefined ? String(req.body.date) : existing.date;
    const newStatus = req.body.status !== undefined ? req.body.status : (existing.status || "pending");
    const newNote = req.body.note !== undefined ? (req.body.note || null) : existing.note;
    const newPostponeDate = req.body.postponeDate || existing.postpone_date || null;

    await run(
      "UPDATE tasks SET title=?, description=?, date=?, status=?, note=?, postpone_date=?, completed=? WHERE id=?",
      [newTitle, newDescription, newDate, newStatus, newNote, newPostponeDate, newStatus === "success" ? 1 : 0, taskId]
    );

    if (Array.isArray(req.body.tags)) {
      await run("DELETE FROM task_tags WHERE task_id = ?", [taskId]);
      const tagIds = await ensureTags(req.body.tags);
      for (const tagId of tagIds) {
        await run("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", [taskId, tagId]);
      }
    }

    // When postponed: create the duplicate task on the target date
    let newTask = null;
    if (newStatus === "postponed" && newPostponeDate) {
      const originId = existing.origin_task_id || taskId;
      const newCount = (existing.postpone_count || 0) + 1;

      // Carry over tags, replacing any previous "Postponed X times" tag
      const tagRows = await all(
        "SELECT tags.name FROM tags JOIN task_tags ON tags.id = task_tags.tag_id WHERE task_tags.task_id = ?",
        [taskId]
      );
      const baseTags = tagRows.map((r) => r.name).filter((t) => !/^Postponed \d+ times?$/i.test(t));
      const childTags = [...baseTags, `Postponed ${newCount} times`];

      const result = await run(
        "INSERT INTO tasks (title, description, date, status, origin_task_id, postpone_count, completed) VALUES (?, ?, ?, 'pending', ?, ?, 0)",
        [newTitle, newDescription, String(newPostponeDate), originId, newCount]
      );

      const childTagIds = await ensureTags(childTags);
      for (const tagId of childTagIds) {
        await run("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", [result.lastID, tagId]);
      }

      newTask = await fetchTaskById(result.lastID);
    }

    res.json({ task: await fetchTaskById(taskId), newTask });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id
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
