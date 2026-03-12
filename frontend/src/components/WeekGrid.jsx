import React, { useEffect, useRef } from "react";

const HOUR_HEIGHT = 60; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TODAY = formatDate(new Date());

function parseMinutes(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const p = match[3].toUpperCase();
  if (p === "AM" && h === 12) h = 0;
  if (p === "PM" && h !== 12) h += 12;
  return h * 60 + m;
}

function getEventStyle(timeStr) {
  const parts = timeStr.split("~").map((s) => s.trim());
  const start = parseMinutes(parts[0]);
  if (start === null) return null;
  const rawEnd = parts[1] ? parseMinutes(parts[1]) : null;
  const end = rawEnd !== null ? rawEnd : start + 60;
  return {
    top: (start / 60) * HOUR_HEIGHT,
    height: Math.max(((end - start) / 60) * HOUR_HEIGHT, 22),
  };
}

function formatHourLabel(h) {
  if (h === 0) return "";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export default function WeekGrid({ days, eventsByDate, tasksByDate, selectedDate, onSelectDate }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
  }, []);

  return (
    <div className="week-grid">
      <div className="week-grid__canvas">
      {/* Day name + date header */}
      <div className="week-grid__header">
        <div className="week-grid__gutter" />
        {days.map((day) => {
          const iso = formatDate(day);
          const isToday = iso === TODAY;
          const isSelected = iso === selectedDate;
          return (
            <div
              key={iso}
              className={"week-grid__day-header" + (isSelected ? " week-grid__day-header--selected" : "")}
              onClick={() => onSelectDate(iso)}
            >
              <span className="week-grid__day-name">{DAY_NAMES[day.getDay()]}</span>
              <span className={"week-grid__day-num" + (isToday ? " week-grid__day-num--today" : "")}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day / untimed events row */}
      <div className="week-grid__allday-row">
        <div className="week-grid__gutter week-grid__gutter--label">all‑day</div>
        {days.map((day) => {
          const iso = formatDate(day);
          const untimedEvents = (eventsByDate[iso] || []).filter(
            (e) => !e.time || !e.time.match(/\d+:\d+/)
          );
          const dayTasks = tasksByDate[iso] || [];
          return (
            <div key={iso} className="week-grid__allday-cell" onClick={() => onSelectDate(iso)}>
              {untimedEvents.map((e) => (
                <span key={e.id} className="week-grid__allday-chip">{e.title}</span>
              ))}
              {dayTasks.length > 0 && (
                <span className="week-grid__task-dots">
                  {dayTasks.map((task) => (
                    <span
                      key={task.id}
                      className={`calendar__task-dot calendar__task-dot--${task.status}`}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="week-grid__scroll" ref={scrollRef}>
        <div className="week-grid__body">
          {/* Hour labels */}
          <div className="week-grid__time-col">
            {HOURS.map((h) => (
              <div key={h} className="week-grid__hour-label">
                {formatHourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const iso = formatDate(day);
            const timedEvents = (eventsByDate[iso] || []).filter(
              (e) => e.time && e.time.match(/\d+:\d+/)
            );
            const isSelected = iso === selectedDate;
            return (
              <div
                key={iso}
                className={"week-grid__day-col" + (isSelected ? " week-grid__day-col--selected" : "")}
                onClick={() => onSelectDate(iso)}
              >
                {HOURS.map((h) => (
                  <div key={h} className="week-grid__hour-cell" />
                ))}
                {timedEvents.map((event) => {
                  const style = getEventStyle(event.time);
                  if (!style) return null;
                  return (
                    <div
                      key={event.id}
                      className="week-grid__event"
                      style={{ top: style.top, height: style.height }}
                      onClick={(e) => { e.stopPropagation(); onSelectDate(iso); }}
                    >
                      <div className="week-grid__event-title">{event.title}</div>
                      {style.height >= 36 && (
                        <div className="week-grid__event-time">
                          {event.time.split("~")[0].trim()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
