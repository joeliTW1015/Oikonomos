const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");

function rowToEvent(r) {
  return { id: r.id, date: r.date, title: r.title, description: r.description || null, time: r.time || null };
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
        "SELECT id, date, title, description, time FROM events WHERE date = ? ORDER BY time, id",
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
        "SELECT id, date, title, description, time FROM events WHERE date >= ? AND date < ? ORDER BY date, time, id",
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
      "INSERT INTO events (title, date, description, time) VALUES (?, ?, ?, ?)",
      [String(title).trim(), String(date), description ? String(description).trim() : null, time ? String(time).trim() : null]
    );

    const row = await get("SELECT id, date, title, description, time FROM events WHERE id = ?", [result.lastID]);
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
      "UPDATE events SET title = ?, description = ?, time = ? WHERE id = ?",
      [String(title).trim(), description ? String(description).trim() : null, time ? String(time).trim() : null, eventId]
    );

    const row = await get("SELECT id, date, title, description, time FROM events WHERE id = ?", [eventId]);
    res.json(rowToEvent(row));
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
