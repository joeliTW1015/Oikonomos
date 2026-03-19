import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Link, Unlink, CheckCircle, AlertCircle, Loader } from "lucide-react";
import {
  fetchSettings,
  saveSetting,
  getGoogleAuthUrl,
  getGoogleStatus,
  disconnectGoogle,
  triggerSync,
  cleanupGoogleEvents,
  deleteAllEvents,
  analyseEmails,
  testEmailConnection,
} from "../api/settingsClient";

export default function SettingsPage() {
  const [status, setStatus] = useState(null); // { connected, email, lastSynced }
  const [settings, setSettings] = useState({});
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteEventsConfirm, setDeleteEventsConfirm] = useState(0); // 0 = idle, 1 = first confirm, 2 = deleting
  const [emailTestStatus, setEmailTestStatus] = useState(null); // null | { ok, error }
  const [emailTesting, setEmailTesting] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [emailPrompt, setEmailPrompt] = useState("");
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [promptSaveResult, setPromptSaveResult] = useState(null);


  const refreshStatus = useCallback(async () => {
    try {
      const [s, cfg] = await Promise.all([getGoogleStatus(), fetchSettings()]);
      setStatus(s);
      setSettings(cfg);
      if (cfg.google_client_id) setClientId(cfg.google_client_id);
      if (cfg.prompt_chat_system !== undefined) setChatPrompt(cfg.prompt_chat_system || "");
      if (cfg.prompt_email_summary !== undefined) setEmailPrompt(cfg.prompt_email_summary || "");
    } catch {
      // Ignore — show whatever we have
    }
  }, []);

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false));
  }, [refreshStatus]);

  async function handleSaveAndConnect() {
    setError(null);
    setSavingCreds(true);
    try {
      await saveSetting("google_client_id", clientId.trim());
      await saveSetting("google_client_secret", clientSecret.trim());

      const { url } = await getGoogleAuthUrl();
      const popup = window.open(url, "gcal-auth", "width=520,height=660,noopener=0");

      const onMessage = (e) => {
        if (e.data?.type === "GOOGLE_AUTH_SUCCESS") {
          window.removeEventListener("message", onMessage);
          clearInterval(pollInterval);
          refreshStatus();
        }
      };
      window.addEventListener("message", onMessage);

      const pollInterval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollInterval);
          window.removeEventListener("message", onMessage);
          refreshStatus();
        }
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to start Google authorization.");
    } finally {
      setSavingCreds(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    try {
      await disconnectGoogle();
      await refreshStatus();
      setSyncResult(null);
    } catch (err) {
      setError(err.message || "Failed to disconnect.");
    }
  }

  async function handleSyncNow() {
    setError(null);
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await triggerSync();
      setSyncResult(result);
      await refreshStatus();
    } catch (err) {
      setError(err.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggle(key, currentValue) {
    const newValue = currentValue === "1" ? "0" : "1";
    try {
      await saveSetting(key, newValue);
      setSettings((prev) => ({ ...prev, [key]: newValue }));
      if (key === "google_sync_events" && newValue === "0") {
        await cleanupGoogleEvents();
      }
    } catch (err) {
      setError(err.message || "Failed to save setting.");
    }
  }

  async function handleGrantGmailAccess() {
    setError(null);
    try {
      const { url } = await getGoogleAuthUrl();
      const popup = window.open(url, "gmail-auth", "width=520,height=660,noopener=0");

      const onMessage = (e) => {
        if (e.data?.type === "GOOGLE_AUTH_SUCCESS") {
          window.removeEventListener("message", onMessage);
          clearInterval(pollInterval);
          refreshStatus();
          setEmailTestStatus(null);
        }
      };
      window.addEventListener("message", onMessage);

      const pollInterval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollInterval);
          window.removeEventListener("message", onMessage);
          refreshStatus();
        }
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to start Gmail authorization.");
    }
  }

  async function handleTestEmailConnection() {
    setEmailTesting(true);
    setEmailTestStatus(null);
    try {
      const result = await testEmailConnection();
      setEmailTestStatus(result);
    } catch (err) {
      setEmailTestStatus({ ok: false, error: err.message });
    } finally {
      setEmailTesting(false);
    }
  }

  async function handleSavePrompts() {
    setSavingPrompts(true);
    setPromptSaveResult(null);
    try {
      await saveSetting("prompt_chat_system", chatPrompt.trim());
      await saveSetting("prompt_email_summary", emailPrompt.trim());
      setPromptSaveResult("saved");
    } catch (err) {
      setPromptSaveResult("error");
      setError(err.message || "Failed to save prompts.");
    } finally {
      setSavingPrompts(false);
    }
  }

  async function handleResetPrompts() {
    setSavingPrompts(true);
    setPromptSaveResult(null);
    try {
      await saveSetting("prompt_chat_system", "");
      await saveSetting("prompt_email_summary", "");
      setChatPrompt("");
      setEmailPrompt("");
      setPromptSaveResult("reset");
    } catch (err) {
      setError(err.message || "Failed to reset prompts.");
    } finally {
      setSavingPrompts(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <Loader size={24} className="settings-spinner" />
        </div>
      </div>
    );
  }

  const connected = status?.connected;
  const syncEvents = settings.google_sync_events !== "0";
  const syncTasks = settings.google_sync_tasks === "1";
  const hasCredentials = !!(settings.google_client_id);

  const lastSyncedDisplay = status?.lastSynced
    ? new Date(status.lastSynced).toLocaleString()
    : "Never";

  return (
    <div className="settings-page">
      <h2 className="settings-page__title">Settings</h2>

      <section className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">Google Calendar Sync</span>
          {connected ? (
            <span className="settings-badge settings-badge--connected">
              <CheckCircle size={13} /> Connected
            </span>
          ) : (
            <span className="settings-badge settings-badge--disconnected">
              Not connected
            </span>
          )}
        </div>

        {connected && status?.email && (
          <p className="settings-email">{status.email}</p>
        )}

        {error && (
          <div className="settings-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {!connected && (
          <div className="settings-creds">
            <p className="settings-creds__help">
              To connect, you need a Google Cloud project with the Calendar API enabled and OAuth2
              credentials (type: <strong>Web application</strong>, redirect URI:{" "}
              <code>http://localhost:3001/api/auth/google/callback</code>).
            </p>

            <label className="settings-label">
              Client ID
              <input
                className="settings-input"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Paste your OAuth2 Client ID"
                autoComplete="off"
              />
            </label>

            <label className="settings-label">
              Client Secret
              <input
                className="settings-input"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Paste your OAuth2 Client Secret"
                autoComplete="off"
              />
            </label>

            <button
              className="settings-btn settings-btn--primary"
              onClick={handleSaveAndConnect}
              disabled={savingCreds || !clientId.trim() || !clientSecret.trim()}
            >
              {savingCreds ? (
                <Loader size={15} className="settings-spinner" />
              ) : (
                <Link size={15} />
              )}
              Save &amp; Connect Google Calendar
            </button>

            {hasCredentials && !clientSecret && (
              <p className="settings-hint">Credentials saved. Enter your Client Secret again to reconnect.</p>
            )}
          </div>
        )}

        {connected && (
          <>
            <div className="settings-toggles">
              <label className="settings-toggle">
                <span className="settings-toggle__label">
                  <span>Sync events</span>
                  <span className="settings-toggle__sub">Import events from Google Calendar (read-only — Oikonomos will not modify Google)</span>
                </span>
                <button
                  className={`settings-toggle__btn ${syncEvents ? "settings-toggle__btn--on" : ""}`}
                  onClick={() => handleToggle("google_sync_events", settings.google_sync_events ?? "1")}
                  role="switch"
                  aria-checked={syncEvents}
                />
              </label>

              <label className="settings-toggle">
                <span className="settings-toggle__label">
                  <span>Sync tasks as all-day events</span>
                  <span className="settings-toggle__sub">Tasks with dates appear in Google Calendar</span>
                </span>
                <button
                  className={`settings-toggle__btn ${syncTasks ? "settings-toggle__btn--on" : ""}`}
                  onClick={() => handleToggle("google_sync_tasks", settings.google_sync_tasks ?? "0")}
                  role="switch"
                  aria-checked={syncTasks}
                />
              </label>
            </div>

            <div className="settings-sync-row">
              <button
                className="settings-btn settings-btn--primary"
                onClick={handleSyncNow}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader size={15} className="settings-spinner" />
                ) : (
                  <RefreshCw size={15} />
                )}
                {syncing ? "Syncing…" : "Sync Now"}
              </button>

              <span className="settings-last-synced">Last synced: {lastSyncedDisplay}</span>
            </div>

            {syncResult && (
              <div className="settings-sync-result">
                Pulled {syncResult.pulled} · Pushed {syncResult.pushed} · Deleted {syncResult.deleted}
                {syncResult.errors?.length > 0 && (
                  <span className="settings-sync-result__errors">
                    {" "}· {syncResult.errors.length} error(s)
                  </span>
                )}
              </div>
            )}

            <hr className="settings-divider" />

            <button
              className="settings-btn settings-btn--danger"
              onClick={handleDisconnect}
            >
              <Unlink size={15} />
              Disconnect Google Calendar
            </button>
          </>
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">Email Analysis</span>
        </div>

        <div className="settings-toggles">
          <label className="settings-toggle">
            <span className="settings-toggle__label">
              <span>Enable email analysis</span>
              <span className="settings-toggle__sub">Allow the Summary page to analyse your recent Gmail emails</span>
            </span>
            <button
              className={`settings-toggle__btn ${settings.email_enabled === "1" ? "settings-toggle__btn--on" : ""}`}
              onClick={() => handleToggle("email_enabled", settings.email_enabled ?? "0")}
              role="switch"
              aria-checked={settings.email_enabled === "1"}
            />
          </label>
        </div>

        <label className="settings-label" style={{ marginTop: "0.75rem" }}>
          Emails to fetch
          <input
            className="settings-input"
            type="number"
            min="1"
            max="100"
            value={settings.email_fetch_count ?? "20"}
            onChange={(e) => {
              const v = e.target.value;
              setSettings((prev) => ({ ...prev, email_fetch_count: v }));
              saveSetting("email_fetch_count", v).catch(() => {});
            }}
            style={{ width: "80px" }}
          />
        </label>

        {!hasCredentials ? (
          <p className="settings-hint" style={{ marginTop: "0.5rem" }}>
            Set up your Google credentials above first, then grant Gmail access.
          </p>
        ) : (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p className="settings-hint">
              Gmail uses the same Google account as Calendar. Click below to authorize Gmail access
              (you may need to re-grant if you connected before this feature was added).
            </p>
            <div className="settings-sync-row">
              <button
                className="settings-btn settings-btn--primary"
                onClick={handleGrantGmailAccess}
              >
                <Link size={15} />
                {connected ? "Reauthorize with Gmail Access" : "Connect Google &amp; Grant Gmail Access"}
              </button>
            </div>
            {connected && (
              <div className="settings-sync-row">
                <button
                  className="settings-btn settings-btn--neutral"
                  onClick={handleTestEmailConnection}
                  disabled={emailTesting}
                >
                  {emailTesting ? <Loader size={15} className="settings-spinner" /> : <CheckCircle size={15} />}
                  {emailTesting ? "Testing…" : "Test Gmail Connection"}
                </button>
                {emailTestStatus && (
                  <span className={emailTestStatus.ok ? "settings-sync-result" : "settings-error"}>
                    {emailTestStatus.ok ? "Gmail connected" : emailTestStatus.error}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">AI Prompts</span>
        </div>

        <label className="settings-label">
          Chat System Prompt
          <span className="settings-toggle__sub">Leave blank to use the default prompt</span>
          <textarea
            className="settings-input settings-textarea"
            rows={5}
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            placeholder="You are Oikonomos AI, a helpful personal assistant…"
          />
        </label>

        <label className="settings-label" style={{ marginTop: "0.75rem" }}>
          Email Summary Prompt
          <span className="settings-toggle__sub">Leave blank to use the default prompt</span>
          <textarea
            className="settings-input settings-textarea"
            rows={5}
            value={emailPrompt}
            onChange={(e) => setEmailPrompt(e.target.value)}
            placeholder="You are a personal assistant. Review the following emails and provide a concise daily briefing…"
          />
        </label>

        <div className="settings-sync-row" style={{ marginTop: "0.75rem" }}>
          <button
            className="settings-btn settings-btn--primary"
            onClick={handleSavePrompts}
            disabled={savingPrompts}
          >
            {savingPrompts ? <Loader size={15} className="settings-spinner" /> : null}
            {savingPrompts ? "Saving…" : "Save Prompts"}
          </button>
          <button
            className="settings-btn settings-btn--neutral"
            onClick={handleResetPrompts}
            disabled={savingPrompts}
          >
            Reset to Default
          </button>
          {promptSaveResult === "saved" && <span className="settings-sync-result">Saved</span>}
          {promptSaveResult === "reset" && <span className="settings-sync-result">Reset to defaults</span>}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <span className="settings-section__title">Danger Zone</span>
        </div>
        <div className="settings-danger-row">
          {deleteEventsConfirm === 0 && (
            <button
              className="settings-btn settings-btn--danger"
              onClick={() => setDeleteEventsConfirm(1)}
            >
              Delete All Events
            </button>
          )}
          {deleteEventsConfirm === 1 && (
            <>
              <span className="settings-danger-warning">This will permanently delete every event. Are you sure?</span>
              <button
                className="settings-btn settings-btn--danger"
                onClick={async () => {
                  setDeleteEventsConfirm(2);
                  try {
                    await deleteAllEvents();
                  } catch (err) {
                    setError(err.message || "Failed to delete events.");
                  } finally {
                    setDeleteEventsConfirm(0);
                  }
                }}
              >
                Yes, delete all events
              </button>
              <button
                className="settings-btn settings-btn--neutral"
                onClick={() => setDeleteEventsConfirm(0)}
              >
                Cancel
              </button>
            </>
          )}
          {deleteEventsConfirm === 2 && (
            <span className="settings-danger-warning">Deleting…</span>
          )}
        </div>
      </section>
    </div>
  );
}
