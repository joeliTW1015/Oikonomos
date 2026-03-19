const { google } = require("googleapis");
const { getOAuth2Client } = require("../google/auth");

/**
 * Decode base64url-encoded Gmail message part body.
 */
function decodeBody(data) {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/**
 * Recursively find a plain-text part in a MIME message.
 */
function extractPlainText(part) {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBody(part.body.data);
  }
  if (part.parts) {
    for (const p of part.parts) {
      const text = extractPlainText(p);
      if (text) return text;
    }
  }
  return "";
}

/**
 * Fetch recent emails from Gmail.
 * @param {number} count - Number of emails to fetch (default 20)
 * @returns {Array<{ subject, from, date, body }>}
 */
async function fetchRecentEmails(count = 20) {
  const auth = await getOAuth2Client();
  if (!auth) throw new Error("Google account not connected");

  const gmail = google.gmail({ version: "v1", auth });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults: count,
    labelIds: ["INBOX"],
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  const emails = await Promise.all(
    messages.map(async ({ id }) => {
      try {
        const msgRes = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "full",
        });
        const msg = msgRes.data;
        const headers = msg.payload?.headers || [];
        const get = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const body = extractPlainText(msg.payload) || msg.snippet || "";
        return {
          subject: get("Subject") || "(no subject)",
          from: get("From"),
          date: get("Date"),
          body: body.slice(0, 400).replace(/\s+/g, " ").trim(),
        };
      } catch {
        return null;
      }
    })
  );

  return emails.filter(Boolean);
}

module.exports = { fetchRecentEmails };
