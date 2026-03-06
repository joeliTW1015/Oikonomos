const express = require("express");
const router = express.Router();
const { run, all, get } = require("../db");

router.get("/", async (req, res, next) => {
  try {
    const rows = await all("SELECT id, name, type, done FROM shopping_items ORDER BY type, done, id");
    res.json(rows.map((r) => ({ ...r, done: Boolean(r.done) })));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const itemType = type === "wanted" ? "wanted" : "needed";
    const result = await run(
      "INSERT INTO shopping_items (name, type, done) VALUES (?, ?, 0)",
      [String(name).trim(), itemType]
    );
    const row = await get("SELECT id, name, type, done FROM shopping_items WHERE id = ?", [result.lastID]);
    res.status(201).json({ ...row, done: Boolean(row.done) });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const existing = await get("SELECT id, name, type, done FROM shopping_items WHERE id = ?", [itemId]);
    if (!existing) {
      res.status(404).json({ error: "item not found" });
      return;
    }
    const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
    const type = req.body.type !== undefined ? (req.body.type === "wanted" ? "wanted" : "needed") : existing.type;
    const done = req.body.done !== undefined ? (req.body.done ? 1 : 0) : existing.done;
    await run("UPDATE shopping_items SET name=?, type=?, done=? WHERE id=?", [name, type, done, itemId]);
    const row = await get("SELECT id, name, type, done FROM shopping_items WHERE id = ?", [itemId]);
    res.json({ ...row, done: Boolean(row.done) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    await run("DELETE FROM shopping_items WHERE id = ?", [itemId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
