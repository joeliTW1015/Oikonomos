const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");

// Resolve which habits apply on a given date string (YYYY-MM-DD)
function habitApplies(habit, date) {
  if (habit.frequency === "daily") return true;
  // frequency is comma-separated day numbers: "0,1,2,3,4,5,6"
  const d = new Date(date + "T00:00:00");
  const dayNum = String(d.getDay());
  return habit.frequency.split(",").map((s) => s.trim()).includes(dayNum);
}

// GET /api/habits?date=YYYY-MM-DD
router.get("/", async (req, res, next) => {
  try {
    const { date } = req.query;
    const habits = await all("SELECT * FROM habits WHERE active = 1 ORDER BY created_at");

    if (!date) {
      return res.json(habits.map((h) => ({ ...h, done: false })));
    }

    const completions = await all(
      "SELECT habit_id FROM habit_completions WHERE date = ?",
      [date]
    );
    const doneSet = new Set(completions.map((c) => c.habit_id));

    const result = habits
      .filter((h) => habitApplies(h, date))
      .map((h) => ({ ...h, done: doneSet.has(h.id) }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/habits/all — list all habits (including inactive) for management
router.get("/all", async (req, res, next) => {
  try {
    const habits = await all("SELECT * FROM habits ORDER BY created_at");
    res.json(habits);
  } catch (err) {
    next(err);
  }
});

// POST /api/habits — create habit
router.post("/", async (req, res, next) => {
  try {
    const { title, frequency } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    const freq = frequency || "daily";
    const result = await run(
      "INSERT INTO habits (title, frequency) VALUES (?, ?)",
      [String(title).trim(), String(freq)]
    );
    const habit = await get("SELECT * FROM habits WHERE id = ?", [result.lastID]);
    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

// PUT /api/habits/:id — update habit
router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });
    const existing = await get("SELECT * FROM habits WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "habit not found" });

    const title = req.body.title !== undefined ? String(req.body.title).trim() : existing.title;
    const frequency = req.body.frequency !== undefined ? String(req.body.frequency) : existing.frequency;
    const active = req.body.active !== undefined ? (req.body.active ? 1 : 0) : existing.active;

    await run(
      "UPDATE habits SET title = ?, frequency = ?, active = ? WHERE id = ?",
      [title, frequency, active, id]
    );
    const habit = await get("SELECT * FROM habits WHERE id = ?", [id]);
    res.json(habit);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habits/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });
    await run("DELETE FROM habits WHERE id = ?", [id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/habits/:id/toggle — toggle completion for a date
router.post("/:id/toggle", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });

    const existing = await get(
      "SELECT id FROM habit_completions WHERE habit_id = ? AND date = ?",
      [id, date]
    );

    if (existing) {
      await run("DELETE FROM habit_completions WHERE habit_id = ? AND date = ?", [id, date]);
      return res.json({ done: false });
    } else {
      await run("INSERT INTO habit_completions (habit_id, date) VALUES (?, ?)", [id, date]);
      return res.json({ done: true });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
