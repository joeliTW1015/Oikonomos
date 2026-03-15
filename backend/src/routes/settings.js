const express = require("express");
const router = express.Router();
const { run, all } = require("../db");

const SENSITIVE_KEYS = new Set(["google_access_token", "google_refresh_token", "google_oauth_state"]);

router.get("/", async (req, res, next) => {
  try {
    const rows = await all("SELECT key, value FROM settings");
    const result = {};
    for (const row of rows) {
      if (!SENSITIVE_KEYS.has(row.key)) {
        result[row.key] = row.value;
      }
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ error: "key is required" });
    }
    await run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [String(key), value === null || value === undefined ? null : String(value)]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
