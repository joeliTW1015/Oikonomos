const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");
const { pushEventToGoogle, deleteFromGoogle } = require("../google/sync");

function rowToEvent(r) {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    description: r.description || null,
    time: r.time || null,
    google_event_id: r.google_event_id || null,
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
        "SELECT id, date, title, description, time, google_event_id FROM events WHERE date = ? ORDER BY time, id",
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
        "SELECT id, date, title, description, time, google_event_id FROM events WHERE date >= ? AND date < ? ORDER BY date, time, id",
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

    const row = await get(
      "SELECT id, date, title, description, time, google_event_id FROM events WHERE id = ?",
      [result.lastID]
    );
    const event = rowToEvent(row);
    res.status(201).json(event);

    // Auto-push to Google (fire-and-forget)
    pushEventToGoogle(event).catch((e) => console.warn("Google sync push failed:", e.message));
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

    const existing = await get(
      "SELECT id, google_event_id FROM events WHERE id = ?",
      [eventId]
    );
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

    const row = await get(
      "SELECT id, date, title, description, time, google_event_id FROM events WHERE id = ?",
      [eventId]
    );
    const event = rowToEvent(row);
    res.json(event);

    // Auto-push to Google (fire-and-forget)
    pushEventToGoogle(event).catch((e) => console.warn("Google sync push failed:", e.message));
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

    const existing = await get(
      "SELECT google_event_id FROM events WHERE id = ?",
      [eventId]
    );

    await run("DELETE FROM events WHERE id = ?", [eventId]);
    res.status(204).end();

    // Auto-delete from Google (fire-and-forget)
    if (existing?.google_event_id) {
      deleteFromGoogle(existing.google_event_id).catch((e) =>
        console.warn("Google sync delete failed:", e.message)
      );
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
