import React, { useState, useEffect } from "react";
import { Loader, Mail } from "lucide-react";
import Markdown from "react-markdown";
import { fetchSettings, analyseEmails } from "../api/settingsClient";

export default function SummaryPage({ date, tasks, events }) {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [emailCount, setEmailCount] = useState(0);
  const [analyseError, setAnalyseError] = useState(null);

  useEffect(() => {
    fetchSettings()
      .then((cfg) => {
        setEmailEnabled(cfg.email_enabled === "1");
        // google_refresh_token is filtered — use google_token_expiry as proxy for connected state
        setGoogleConnected(!!(cfg.google_token_expiry || cfg.google_calendar_id || cfg.google_client_id));
      })
      .catch(() => {});
  }, []);

  const today = date || new Date().toISOString().slice(0, 10);
  const todayTasks = (tasks || []).filter((t) => t.date === today);
  const pendingCount = todayTasks.filter((t) => t.status !== "done").length;
  const doneCount = todayTasks.filter((t) => t.status === "done").length;
  const todayEvents = (events || []).filter((e) => e.date === today);

  async function handleAnalyse() {
    setAnalysing(true);
    setInsights(null);
    setAnalyseError(null);
    try {
      const result = await analyseEmails();
      setInsights(result.insights);
      setEmailCount(result.emailCount);
    } catch (err) {
      setAnalyseError(err.message || "Failed to analyse emails.");
    } finally {
      setAnalysing(false);
    }
  }

  const canAnalyse = emailEnabled && googleConnected;

  return (
    <div className="summary-page">
      <div className="summary-page__header">
        <div>
          <h2 className="summary-page__title">Daily Summary</h2>
          <p className="summary-page__date">{today}</p>
        </div>
        {canAnalyse && (
          <button
            className="settings-btn settings-btn--primary"
            onClick={handleAnalyse}
            disabled={analysing}
          >
            {analysing ? <Loader size={15} className="settings-spinner" /> : <Mail size={15} />}
            {analysing ? "Analysing…" : "Analyse Emails"}
          </button>
        )}
      </div>

      <section className="summary-section">
        <h3 className="summary-section__title">Today's Snapshot</h3>
        <ul className="summary-list">
          <li>
            <strong>{todayTasks.length}</strong> task{todayTasks.length !== 1 ? "s" : ""}{" "}
            ({pendingCount} pending, {doneCount} done)
          </li>
          <li>
            <strong>{todayEvents.length}</strong> event{todayEvents.length !== 1 ? "s" : ""} today
          </li>
        </ul>
      </section>

      {!emailEnabled && (
        <p className="summary-nudge">
          Enable email analysis in Settings to get a daily Gmail briefing.
        </p>
      )}

      {emailEnabled && !googleConnected && (
        <p className="summary-nudge">
          Connect your Google account in Settings to enable Gmail access.
        </p>
      )}

      {analyseError && (
        <p className="summary-error">{analyseError}</p>
      )}

      {insights && (
        <section className="summary-section">
          <h3 className="summary-section__title">Email Insights</h3>
          <div className="summary-insights">
            <Markdown>{insights}</Markdown>
          </div>
          <p className="summary-insights__meta">Analysed {emailCount} email{emailCount !== 1 ? "s" : ""}</p>
        </section>
      )}
    </div>
  );
}
