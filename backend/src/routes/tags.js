const express = require("express");
const router = express.Router();
const { all } = require("../db");

router.get("/", async (req, res, next) => {
  try {
    const rows = await all("SELECT id, name FROM tags ORDER BY name");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
