const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");

const toGoal = (r) => ({ id: r.id, title: r.title, done: Boolean(r.done) });

router.get("/", async (req, res, next) => {
  try {
    const rows = await all("SELECT id, title, done FROM goals ORDER BY done, id");
    res.json(rows.map(toGoal));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    const result = await run("INSERT INTO goals (title, done) VALUES (?, 0)", [String(title).trim()]);
    const row = await get("SELECT id, title, done FROM goals WHERE id = ?", [result.lastID]);
    res.status(201).json(toGoal(row));
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const goalId = Number(req.params.id);
    const existing = await get("SELECT id, title, done FROM goals WHERE id = ?", [goalId]);
    if (!existing) { res.status(404).json({ error: "not found" }); return; }
    const title = req.body.title !== undefined ? String(req.body.title).trim() : existing.title;
    const done  = req.body.done  !== undefined ? (req.body.done ? 1 : 0) : existing.done;
    await run("UPDATE goals SET title=?, done=? WHERE id=?", [title, done, goalId]);
    const row = await get("SELECT id, title, done FROM goals WHERE id = ?", [goalId]);
    res.json(toGoal(row));
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await run("DELETE FROM goals WHERE id = ?", [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
