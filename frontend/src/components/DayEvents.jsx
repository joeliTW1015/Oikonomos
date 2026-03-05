import React, { useMemo, useState } from "react";

const HOURS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00","15","30","45"];

const DEFAULT_TIME = {
  enabled: false,
  startH: "9", startM: "00", startP: "AM",
  isDuration: false,
  endH: "10", endM: "00", endP: "AM"
};

function formatTimePart(h, m, p) {
  return `${h}:${m} ${p}`;
}

function buildTimeString(t) {
  if (!t.enabled) return null;
  const start = formatTimePart(t.startH, t.startM, t.startP);
  if (!t.isDuration) return start;
  return `${start} ~ ${formatTimePart(t.endH, t.endM, t.endP)}`;
}

function toSortMinutes(timeStr) {
  if (!timeStr) return Infinity;
  const part = timeStr.split("~")[0].trim();
  const match = part.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return Infinity;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const p = match[3].toUpperCase();
  if (p === "AM" && h === 12) h = 0;
  if (p === "PM" && h !== 12) h += 12;
  return h * 60 + m;
}

function TimePicker({ value, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const toggle = (key) => () => onChange({ ...value, [key]: !value[key] });

  return (
    <div className="time-picker">
      <label className="time-picker__enable">
        <input type="checkbox" checked={value.enabled} onChange={toggle("enabled")} />
        Set time
      </label>

      {value.enabled && (
        <div className="time-picker__controls">
          <div className="time-picker__row">
            <select value={value.startH} onChange={set("startH")}>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="time-picker__sep">:</span>
            <select value={value.startM} onChange={set("startM")}>
              {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={value.startP} onChange={set("startP")}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          <label className="time-picker__duration-toggle">
            <input type="checkbox" checked={value.isDuration} onChange={toggle("isDuration")} />
            Duration
          </label>

          {value.isDuration && (
            <div className="time-picker__row">
              <span className="time-picker__until">until</span>
              <select value={value.endH} onChange={set("endH")}>
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="time-picker__sep">:</span>
              <select value={value.endM} onChange={set("endM")}>
                {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={value.endP} onChange={set("endP")}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DayEvents({ date, events, onAdd, onDelete }) {
  const [title, setTitle] = useState("");
  const [timePicker, setTimePicker] = useState(DEFAULT_TIME);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => toSortMinutes(a.time) - toSortMinutes(b.time));
  }, [events]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), date, time: buildTimeString(timePicker) });
    setTitle("");
    setTimePicker(DEFAULT_TIME);
  };

  return (
    <section className="day events-section">
      <h3>
        Events <span className="day__count">{events.length} events</span>
      </h3>
      <form className="day__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add an event"
        />
        <TimePicker value={timePicker} onChange={setTimePicker} />
        <button type="submit">Add</button>
      </form>
      <div className="day__list">
        {sortedEvents.map((event) => (
          <div key={event.id} className="day__item event-item">
            <div className="event-item__body">
              {event.time ? (
                <span className="event-item__time">{event.time}</span>
              ) : null}
              <span className="event-item__title">{event.title}</span>
            </div>
            <div className="day__actions">
              <button type="button" onClick={() => onDelete(event.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
