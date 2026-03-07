const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");

const toTodo = (r) => ({ id: r.id, title: r.title, done: Boolean(r.done) });

router.get("/", async (req, res, next) => {
  try {
    const rows = await all("SELECT id, title, done FROM long_term_todos ORDER BY done, id");
    res.json(rows.map(toTodo));
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    const result = await run("INSERT INTO long_term_todos (title, done) VALUES (?, 0)", [String(title).trim()]);
    const row = await get("SELECT id, title, done FROM long_term_todos WHERE id = ?", [result.lastID]);
    res.status(201).json(toTodo(row));
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const todoId = Number(req.params.id);
    const existing = await get("SELECT id, title, done FROM long_term_todos WHERE id = ?", [todoId]);
    if (!existing) { res.status(404).json({ error: "not found" }); return; }
    const title = req.body.title !== undefined ? String(req.body.title).trim() : existing.title;
    const done  = req.body.done  !== undefined ? (req.body.done ? 1 : 0) : existing.done;
    await run("UPDATE long_term_todos SET title=?, done=? WHERE id=?", [title, done, todoId]);
    const row = await get("SELECT id, title, done FROM long_term_todos WHERE id = ?", [todoId]);
    res.json(toTodo(row));
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await run("DELETE FROM long_term_todos WHERE id = ?", [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
