import React, { useMemo, useState } from "react";
import { parseTags } from "../state/tasks.js";

function tagsToString(tags) { return (tags || []).join(", "); }

const HOURS = ["1","2","3","4","5","6","7","8","9","10","11","12"];

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

function parseTimeToPickerState(timeStr) {
  if (!timeStr) return DEFAULT_TIME;
  const parts = timeStr.split("~").map((s) => s.trim());
  const parsePart = (s) => {
    const match = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return { h: "9", m: "00", p: "AM" };
    return { h: match[1], m: match[2], p: match[3].toUpperCase() };
  };
  const start = parsePart(parts[0]);
  if (parts.length === 1) {
    return { enabled: true, startH: start.h, startM: start.m, startP: start.p, isDuration: false, endH: "10", endM: "00", endP: "AM" };
  }
  const end = parsePart(parts[1]);
  return { enabled: true, startH: start.h, startM: start.m, startP: start.p, isDuration: true, endH: end.h, endM: end.m, endP: end.p };
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

function MinuteInput({ value, onChange }) {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    const n = parseInt(raw, 10);
    if (raw === "" || (n >= 0 && n <= 59)) {
      onChange(raw === "" ? "00" : String(n).padStart(2, "0"));
    }
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      className="time-picker__minute"
      value={value}
      onChange={handleChange}
      maxLength={2}
    />
  );
}

function TimePicker({ value, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const setMinute = (key) => (m) => onChange({ ...value, [key]: m });
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
            <MinuteInput value={value.startM} onChange={setMinute("startM")} />
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
              <MinuteInput value={value.endM} onChange={setMinute("endM")} />
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

export default function DayEvents({ date, events, onAdd, onUpdate, onDelete }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timePicker, setTimePicker] = useState(DEFAULT_TIME);

  const [tagsInput, setTagsInput] = useState("");

  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTimePicker, setEditTimePicker] = useState(DEFAULT_TIME);
  const [editTagsInput, setEditTagsInput] = useState("");

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => toSortMinutes(a.time) - toSortMinutes(b.time));
  }, [events]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim() || null, date, time: buildTimeString(timePicker), tags: parseTags(tagsInput) });
    setTitle("");
    setDescription("");
    setTimePicker(DEFAULT_TIME);
    setTagsInput("");
  };

  const beginEdit = (event) => {
    setEditId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description || "");
    setEditTimePicker(parseTimeToPickerState(event.time));
    setEditTagsInput(tagsToString(event.tags));
  };

  const handleEditSave = (event) => {
    onUpdate(event.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      time: buildTimeString(editTimePicker),
      tags: parseTags(editTagsInput),
    });
    setEditId(null);
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
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <TimePicker value={timePicker} onChange={setTimePicker} />
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Tags (comma separated)"
        />
        <button type="submit">Add</button>
      </form>
      <div className="day__list">
        {sortedEvents.map((event) => (
          <div key={event.id} className="day__item event-item">
            {editId === event.id ? (
              <>
                <input
                  className="day__edit"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <input
                  className="day__edit"
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
                <TimePicker value={editTimePicker} onChange={setEditTimePicker} />
                <input
                  className="day__edit"
                  type="text"
                  value={editTagsInput}
                  onChange={(e) => setEditTagsInput(e.target.value)}
                  placeholder="Tags (comma separated)"
                />
              </>
            ) : (
              <div className="event-item__body">
                {event.time ? (
                  <span className="event-item__time">{event.time}</span>
                ) : null}
                <div className="event-item__content">
                  <span className="event-item__title">{event.title}</span>
                  {event.description ? (
                    <p className="day__description">{event.description}</p>
                  ) : null}
                  {(event.tags || []).length > 0 && (
                    <div className="day__tags">
                      {event.tags.map((tag) => (
                        <span key={tag} className="day__tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="day__actions">
              {editId === event.id ? (
                <>
                  <button type="button" onClick={() => handleEditSave(event)}>Save</button>
                  <button type="button" onClick={() => setEditId(null)}>Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => beginEdit(event)}>Edit</button>
              )}
              <button type="button" onClick={() => onDelete(event.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
