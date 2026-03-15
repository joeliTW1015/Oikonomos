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
    if (row?.id) tagIds.push(row.id);
  }
  return tagIds;
}

function rowToEvent(r) {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    description: r.description || null,
    time: r.time || null,
    google_event_id: r.google_event_id || null,
    tags: r.tags ? r.tags.split("|") : [],
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { date, month } = req.query;

    if (!date && !month) {
      res.status(400).json({ error: "date or month is required" });
      return;
    }

    let rows = [];

    if (date) {
      rows = await all(
        `SELECT e.id, e.date, e.title, e.description, e.time, e.google_event_id,
          GROUP_CONCAT(tags.name, '|') AS tags
        FROM events e
        LEFT JOIN event_tags et ON et.event_id = e.id
        LEFT JOIN tags ON tags.id = et.tag_id
        WHERE e.date = ?
        GROUP BY e.id
        ORDER BY e.time ASC`,
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
        `SELECT e.id, e.date, e.title, e.description, e.time, e.google_event_id,
          GROUP_CONCAT(tags.name, '|') AS tags
        FROM events e
        LEFT JOIN event_tags et ON et.event_id = e.id
        LEFT JOIN tags ON tags.id = et.tag_id
        WHERE e.date >= ? AND e.date < ?
        GROUP BY e.id
        ORDER BY e.date, e.time, e.id`,
        [startStr, endStr]
      );
    }

    res.json(rows.map(rowToEvent));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, date, description, time } = req.body;

    if (!title || !date) {
      res.status(400).json({ error: "title and date are required" });
      return;
    }

    const result = await run(
      "INSERT INTO events (title, date, description, time, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [String(title).trim(), String(date), description ? String(description).trim() : null, time ? String(time).trim() : null]
    );

    const tagIds = await ensureTags(req.body.tags || []);
    for (const tagId of tagIds) {
      await run("INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)", [result.lastID, tagId]);
    }

    const row = await get(
      `SELECT e.id, e.date, e.title, e.description, e.time, e.google_event_id,
        GROUP_CONCAT(tags.name, '|') AS tags
      FROM events e
      LEFT JOIN event_tags et ON et.event_id = e.id
      LEFT JOIN tags ON tags.id = et.tag_id
      WHERE e.id = ?
      GROUP BY e.id`,
      [result.lastID]
    );
    res.status(201).json(rowToEvent(row));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId)) {
      res.status(400).json({ error: "invalid event id" });
      return;
    }

    const existing = await get("SELECT id FROM events WHERE id = ?", [eventId]);
    if (!existing) {
      res.status(404).json({ error: "event not found" });
      return;
    }

    const { title, description, time } = req.body;

    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    await run(
      "UPDATE events SET title = ?, description = ?, time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [String(title).trim(), description ? String(description).trim() : null, time ? String(time).trim() : null, eventId]
    );

    if (Array.isArray(req.body.tags)) {
      await run("DELETE FROM event_tags WHERE event_id = ?", [eventId]);
      const tagIds = await ensureTags(req.body.tags);
      for (const tagId of tagIds) {
        await run("INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)", [eventId, tagId]);
      }
    }

    const row = await get(
      `SELECT e.id, e.date, e.title, e.description, e.time, e.google_event_id,
        GROUP_CONCAT(tags.name, '|') AS tags
      FROM events e
      LEFT JOIN event_tags et ON et.event_id = e.id
      LEFT JOIN tags ON tags.id = et.tag_id
      WHERE e.id = ?
      GROUP BY e.id`,
      [eventId]
    );
    res.json(rowToEvent(row));
  } catch (err) {
    next(err);
  }
});

router.delete("/all", async (req, res, next) => {
  try {
    await run("DELETE FROM events");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId)) {
      res.status(400).json({ error: "invalid event id" });
      return;
    }

    await run("DELETE FROM events WHERE id = ?", [eventId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
