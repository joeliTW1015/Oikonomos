const express = require("express");
const router = express.Router();
const { fetchRecentEmails } = require("../email/gmail");
const { MODEL, getEffectivePrompts } = require("../prompts");
const { get } = require("../db");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

async function getSetting(key) {
  const row = await get("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

router.post("/analyse", async (req, res) => {
  try {
    const countStr = await getSetting("email_fetch_count");
    const count = countStr ? parseInt(countStr, 10) : 20;

    const emails = await fetchRecentEmails(count);
    if (emails.length === 0) {
      return res.json({ insights: "No emails found in your inbox.", emailCount: 0 });
    }

    const { emailSummaryPrompt } = await getEffectivePrompts();

    const emailBlock = emails
      .map((e, i) => `--- Email ${i + 1} ---\nFrom: ${e.from}\nDate: ${e.date}\nSubject: ${e.subject}\n${e.body}`)
      .join("\n\n");

    const ollamaBody = {
      model: MODEL,
      stream: false,
      messages: [
        { role: "system", content: emailSummaryPrompt },
        { role: "user", content: `Here are my recent emails:\n\n${emailBlock}` },
      ],
    };

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ollamaBody),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      console.error("Ollama error:", text);
      return res.status(502).json({ error: "Ollama request failed", detail: text });
    }

    const data = await ollamaRes.json();
    res.json({ insights: data.message?.content || "", emailCount: emails.length });
  } catch (err) {
    console.error("Email analyse error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/test-connection", async (req, res) => {
  try {
    await fetchRecentEmails(1);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

module.exports = router;
