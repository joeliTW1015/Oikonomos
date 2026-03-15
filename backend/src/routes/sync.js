const express = require("express");
const router = express.Router();
const { pullFromGoogle, deleteGoogleSourcedEvents } = require("../google/sync");
const { isConnected } = require("../google/auth");

router.post("/google", async (req, res, next) => {
  try {
    if (!(await isConnected())) {
      return res.status(400).json({ error: "Google Calendar is not connected" });
    }
    const result = await pullFromGoogle();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/cleanup", async (req, res, next) => {
  try {
    await deleteGoogleSourcedEvents();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
