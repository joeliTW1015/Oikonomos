const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { google } = require("googleapis");
const { getSetting, saveSetting, deleteSetting, getOAuth2Client, isConnected, buildAuthUrl } = require("../google/auth");
const { deleteGoogleSourcedEvents } = require("../google/sync");

// GET /api/auth/google/url — generate OAuth authorization URL
router.get("/google/url", async (req, res, next) => {
  try {
    const clientId = await getSetting("google_client_id");
    const clientSecret = await getSetting("google_client_secret");

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: "Google Client ID and Secret must be saved in settings first" });
    }

    const state = crypto.randomBytes(16).toString("hex");
    await saveSetting("google_oauth_state", state);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "http://localhost:3001/api/auth/google/callback"
    );

    const url = buildAuthUrl(oauth2Client, state);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google/callback — OAuth redirect URI
router.get("/google/callback", async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.send(popupHtml("error", `Google denied access: ${error}`));
    }

    const savedState = await getSetting("google_oauth_state");
    if (!state || state !== savedState) {
      return res.status(400).send(popupHtml("error", "Invalid OAuth state. Please try again."));
    }

    const clientId = await getSetting("google_client_id");
    const clientSecret = await getSetting("google_client_secret");

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "http://localhost:3001/api/auth/google/callback"
    );

    const { tokens } = await oauth2Client.getToken(code);

    await saveSetting("google_access_token", tokens.access_token || null);
    await saveSetting("google_refresh_token", tokens.refresh_token || null);
    await saveSetting("google_token_expiry", tokens.expiry_date ? String(tokens.expiry_date) : null);
    await deleteSetting("google_oauth_state");

    // Try to get user email for display
    oauth2Client.setCredentials(tokens);
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      await saveSetting("google_user_email", userInfo.data.email || null);
    } catch {
      // Non-critical — continue without email
    }

    res.send(popupHtml("success"));
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.send(popupHtml("error", "Authentication failed. Please try again."));
  }
});

// GET /api/auth/google/status — connection status
router.get("/google/status", async (req, res, next) => {
  try {
    const connected = await isConnected();
    const lastSynced = await getSetting("google_last_synced");
    const email = await getSetting("google_user_email");
    res.json({ connected, email: email || null, lastSynced: lastSynced || null });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/google — disconnect
router.delete("/google", async (req, res, next) => {
  try {
    const keysToDelete = [
      "google_access_token",
      "google_refresh_token",
      "google_token_expiry",
      "google_oauth_state",
      "google_user_email",
      "google_last_synced",
    ];
    for (const key of keysToDelete) {
      await deleteSetting(key);
    }
    await deleteGoogleSourcedEvents();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

function popupHtml(status, message) {
  if (status === "success") {
    return `<!DOCTYPE html>
<html>
<head><title>Connected</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9f9f9;">
<div style="text-align:center;">
  <p style="font-size:1.2rem;color:#333;">Connected successfully! This window will close.</p>
</div>
<script>
  try { window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*'); } catch(e) {}
  setTimeout(() => window.close(), 1000);
</script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9f9f9;">
<div style="text-align:center;">
  <p style="font-size:1.2rem;color:#c00;">${message || "An error occurred."}</p>
  <button onclick="window.close()" style="margin-top:1rem;padding:.5rem 1.5rem;cursor:pointer;">Close</button>
</div>
</body>
</html>`;
}

module.exports = router;
