const { google } = require("googleapis");
const { run, get } = require("../db");

const REDIRECT_URI = "http://localhost:3001/api/auth/google/callback";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

async function getSetting(key) {
  const row = await get("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

async function saveSetting(key, value) {
  await run(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, value === null || value === undefined ? null : String(value)]
  );
}

async function deleteSetting(key) {
  await run("DELETE FROM settings WHERE key = ?", [key]);
}

async function getOAuth2Client() {
  const clientId = await getSetting("google_client_id");
  const clientSecret = await getSetting("google_client_secret");
  if (!clientId || !clientSecret) return null;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const accessToken = await getSetting("google_access_token");
  const refreshToken = await getSetting("google_refresh_token");
  const expiry = await getSetting("google_token_expiry");

  if (!refreshToken) return null;

  oauth2Client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken,
    expiry_date: expiry ? Number(expiry) : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) await saveSetting("google_access_token", tokens.access_token);
    if (tokens.expiry_date) await saveSetting("google_token_expiry", String(tokens.expiry_date));
    if (tokens.refresh_token) await saveSetting("google_refresh_token", tokens.refresh_token);
  });

  return oauth2Client;
}

async function isConnected() {
  const token = await getSetting("google_refresh_token");
  return !!token;
}

function buildAuthUrl(oauth2Client, state) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

module.exports = {
  getSetting,
  saveSetting,
  deleteSetting,
  getOAuth2Client,
  isConnected,
  buildAuthUrl,
  REDIRECT_URI,
};
