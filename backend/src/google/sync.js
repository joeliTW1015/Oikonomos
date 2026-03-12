const { google } = require("googleapis");
const { run, get, all } = require("../db");
const { getOAuth2Client, getSetting, saveSetting, isConnected } = require("./auth");
const {
  localEventToGoogleEvent,
  localTaskToGoogleEvent,
  googleEventToLocalEvent,
  googleEventToLocalTask,
  getOikonomosType,
} = require("./fieldmap");

async function getCalendarId() {
  return (await getSetting("google_calendar_id")) || "primary";
}

async function isTaskSyncEnabled() {
  const val = await getSetting("google_sync_tasks");
  return val === "1";
}

async function isEventSyncEnabled() {
  const val = await getSetting("google_sync_events");
  // Default to enabled if not set
  return val !== "0";
}

/**
 * Push a local event to Google Calendar.
 * Creates or updates based on whether google_event_id is set.
 * Updates the local DB with the returned google_event_id.
 */
async function pushEventToGoogle(localEvent) {
  if (!(await isEventSyncEnabled())) return;
  const auth = await getOAuth2Client();
  if (!auth) return;

  const calendarId = await getCalendarId();
  const calendar = google.calendar({ version: "v3", auth });
  const resource = localEventToGoogleEvent(localEvent);

  if (localEvent.google_event_id) {
    await calendar.events.patch({
      calendarId,
      eventId: localEvent.google_event_id,
      requestBody: resource,
    });
  } else {
    const res = await calendar.events.insert({ calendarId, requestBody: resource });
    const googleEventId = res.data.id;
    await run(
      "UPDATE events SET google_event_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [googleEventId, localEvent.id]
    );
  }
}

/**
 * Push a local task to Google Calendar (as an all-day event).
 */
async function pushTaskToGoogle(localTask) {
  if (!(await isTaskSyncEnabled())) return;
  const auth = await getOAuth2Client();
  if (!auth) return;

  const calendarId = await getCalendarId();
  const calendar = google.calendar({ version: "v3", auth });
  const resource = localTaskToGoogleEvent(localTask);

  if (localTask.google_event_id) {
    await calendar.events.patch({
      calendarId,
      eventId: localTask.google_event_id,
      requestBody: resource,
    });
  } else {
    const res = await calendar.events.insert({ calendarId, requestBody: resource });
    const googleEventId = res.data.id;
    await run(
      "UPDATE tasks SET google_event_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [googleEventId, localTask.id]
    );
  }
}

/**
 * Delete a Google Calendar event by its Google event ID.
 * Silently ignores 404 (already deleted on Google).
 */
async function deleteFromGoogle(googleEventId) {
  const auth = await getOAuth2Client();
  if (!auth) return;

  const calendarId = await getCalendarId();
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
  } catch (err) {
    if (err?.code === 404 || err?.status === 404) return; // Already gone
    throw err;
  }
}

/**
 * Full two-way reconciliation over a 90-day window.
 * Returns { pushed, pulled, deleted, errors }.
 */
async function pullFromGoogle() {
  const auth = await getOAuth2Client();
  if (!auth) throw new Error("Google Calendar not connected");

  const calendarId = await getCalendarId();
  const calendar = google.calendar({ version: "v3", auth });

  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - 30);
  const windowEnd = new Date(today);
  windowEnd.setDate(today.getDate() + 60);

  // Fetch all Google events in the window
  const listRes = await calendar.events.list({
    calendarId,
    timeMin: windowStart.toISOString(),
    timeMax: windowEnd.toISOString(),
    singleEvents: true,
    maxResults: 2500,
  });

  const googleEvents = listRes.data.items || [];
  const googleEventIds = new Set(googleEvents.map((e) => e.id));

  let pushed = 0;
  let pulled = 0;
  let deleted = 0;
  const errors = [];

  // Partition Google events by type
  const googleCalEvents = googleEvents.filter((e) => getOikonomosType(e) !== "task");
  const googleTaskEvents = googleEvents.filter((e) => getOikonomosType(e) === "task");

  // --- Reconcile events ---
  if (await isEventSyncEnabled()) {
    for (const gEvent of googleCalEvents) {
      try {
        const local = await get("SELECT * FROM events WHERE google_event_id = ?", [gEvent.id]);
        const gUpdated = new Date(gEvent.updated || 0).getTime();

        if (local) {
          const localUpdated = new Date(local.updated_at || 0).getTime();
          if (gUpdated > localUpdated) {
            // Google is newer — overwrite local
            const fields = googleEventToLocalEvent(gEvent);
            await run(
              "UPDATE events SET title = ?, date = ?, time = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [fields.title, fields.date, fields.time, fields.description, local.id]
            );
            pulled++;
          }
        } else {
          // New Google event not in local DB — import it
          const oikonomosId = gEvent.extendedProperties?.private?.oikonomosId;
          if (!oikonomosId) {
            const fields = googleEventToLocalEvent(gEvent);
            if (fields.date) {
              await run(
                "INSERT INTO events (title, date, time, description, google_event_id, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                [fields.title, fields.date, fields.time, fields.description, gEvent.id]
              );
              pulled++;
            }
          }
        }
      } catch (err) {
        errors.push({ type: "pull_event", id: gEvent.id, error: err.message });
      }
    }

    // Delete local events whose Google counterpart is gone
    const localWithGoogle = await all(
      "SELECT id, google_event_id FROM events WHERE google_event_id IS NOT NULL AND date >= ? AND date <= ?",
      [windowStart.toISOString().slice(0, 10), windowEnd.toISOString().slice(0, 10)]
    );
    for (const local of localWithGoogle) {
      if (!googleEventIds.has(local.google_event_id)) {
        await run("DELETE FROM events WHERE id = ?", [local.id]);
        deleted++;
      }
    }

    // Push local events with no google_event_id (created while offline)
    const unpushed = await all(
      "SELECT * FROM events WHERE google_event_id IS NULL AND date >= ? AND date <= ?",
      [windowStart.toISOString().slice(0, 10), windowEnd.toISOString().slice(0, 10)]
    );
    for (const ev of unpushed) {
      try {
        await pushEventToGoogle(ev);
        pushed++;
      } catch (err) {
        errors.push({ type: "push_event", id: ev.id, error: err.message });
      }
    }
  }

  // --- Reconcile tasks ---
  if (await isTaskSyncEnabled()) {
    for (const gEvent of googleTaskEvents) {
      try {
        const local = await get("SELECT * FROM tasks WHERE google_event_id = ?", [gEvent.id]);
        const gUpdated = new Date(gEvent.updated || 0).getTime();

        if (local) {
          const localUpdated = new Date(local.updated_at || 0).getTime();
          if (gUpdated > localUpdated) {
            const fields = googleEventToLocalTask(gEvent);
            await run(
              "UPDATE tasks SET title = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [fields.title, fields.date, local.id]
            );
            pulled++;
          }
        }
        // We don't import unknown Google task events (they were likely deleted locally)
      } catch (err) {
        errors.push({ type: "pull_task", id: gEvent.id, error: err.message });
      }
    }

    // Delete local tasks whose Google counterpart is gone
    const localTasksWithGoogle = await all(
      "SELECT id, google_event_id FROM tasks WHERE google_event_id IS NOT NULL AND date >= ? AND date <= ?",
      [windowStart.toISOString().slice(0, 10), windowEnd.toISOString().slice(0, 10)]
    );
    for (const local of localTasksWithGoogle) {
      if (!googleEventIds.has(local.google_event_id)) {
        await run("DELETE FROM tasks WHERE id = ?", [local.id]);
        deleted++;
      }
    }

    // Push unpushed tasks
    const unpushedTasks = await all(
      "SELECT * FROM tasks WHERE google_event_id IS NULL AND date >= ? AND date <= ?",
      [windowStart.toISOString().slice(0, 10), windowEnd.toISOString().slice(0, 10)]
    );
    for (const task of unpushedTasks) {
      try {
        await pushTaskToGoogle(task);
        pushed++;
      } catch (err) {
        errors.push({ type: "push_task", id: task.id, error: err.message });
      }
    }
  }

  await saveSetting("google_last_synced", new Date().toISOString());

  return { pushed, pulled, deleted, errors };
}

module.exports = {
  pushEventToGoogle,
  pushTaskToGoogle,
  deleteFromGoogle,
  pullFromGoogle,
  isTaskSyncEnabled,
  isEventSyncEnabled,
};
