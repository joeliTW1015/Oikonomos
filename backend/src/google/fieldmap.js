// Pure transforms between local records and Google Calendar event resources.
// No I/O in this file.

/**
 * Parse a time string like "9:00 AM" or "10:30 PM" to { hours, minutes }.
 */
function parseLocalTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Format hours/minutes to "H:MM AM/PM".
 */
function formatLocalTime(hours, minutes) {
  const meridiem = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

/**
 * Local event → Google Calendar event resource.
 */
function localEventToGoogleEvent(event) {
  const resource = {
    summary: event.title,
    description: event.description || undefined,
    extendedProperties: {
      private: {
        oikonomosId: String(event.id),
        oikonomosType: "event",
      },
    },
  };

  const parsed = parseLocalTime(event.time);
  if (parsed) {
    // Timed event — build dateTime, end = start + 1 hour
    const startDate = new Date(`${event.date}T${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    resource.start = { dateTime: startDate.toISOString(), timeZone: "UTC" };
    resource.end = { dateTime: endDate.toISOString(), timeZone: "UTC" };
  } else {
    // All-day event
    resource.start = { date: event.date };
    resource.end = { date: event.date };
  }

  return resource;
}

/**
 * Local task → Google Calendar event resource (all-day).
 */
function localTaskToGoogleEvent(task) {
  return {
    summary: `[Task] ${task.title}`,
    description: [
      task.description || null,
      `Status: ${task.status || "pending"}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { date: task.date },
    end: { date: task.date },
    extendedProperties: {
      private: {
        oikonomosId: String(task.id),
        oikonomosType: "task",
      },
    },
  };
}

/**
 * Google Calendar event resource → local event fields.
 */
function googleEventToLocalEvent(gEvent) {
  let date, time;

  if (gEvent.start?.dateTime) {
    // Timed event
    const dt = new Date(gEvent.start.dateTime);
    date = dt.toISOString().slice(0, 10);
    time = formatLocalTime(dt.getUTCHours(), dt.getUTCMinutes());
  } else {
    // All-day event
    date = gEvent.start?.date || null;
    time = null;
  }

  return {
    title: gEvent.summary || "(no title)",
    date,
    time,
    description: gEvent.description || null,
    googleEventId: gEvent.id,
  };
}

/**
 * Google Calendar event resource → local task fields.
 */
function googleEventToLocalTask(gEvent) {
  const title = (gEvent.summary || "").replace(/^\[Task\]\s*/, "");
  const date = gEvent.start?.date || gEvent.start?.dateTime?.slice(0, 10) || null;
  return {
    title,
    date,
    googleEventId: gEvent.id,
  };
}

/**
 * Get the oikonomosType from a Google event's extended properties.
 */
function getOikonomosType(gEvent) {
  return gEvent.extendedProperties?.private?.oikonomosType || "event";
}

module.exports = {
  localEventToGoogleEvent,
  localTaskToGoogleEvent,
  googleEventToLocalEvent,
  googleEventToLocalTask,
  getOikonomosType,
};
