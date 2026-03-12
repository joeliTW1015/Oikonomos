import React from "react";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const start = new Date(year, month, 1 - startOffset);
  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return days;
}

function buildWeekDays(selectedDate) {
  const d = new Date(selectedDate + "T00:00:00");
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    return day;
  });
}

function formatWeekRange(days) {
  const fmt = (d) => d.toLocaleString("default", { month: "short", day: "numeric" });
  return `${fmt(days[0])} \u2013 ${fmt(days[6])}, ${days[6].getFullYear()}`;
}

const TODAY = formatDate(new Date());

export default function Calendar({
  monthDate,
  tasksByDate,
  eventsByDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  view,
  onViewChange,
  onPrevWeek,
  onNextWeek,
}) {
  const isWeek = view === "week";
  const month = monthDate.getMonth();
  const days = isWeek ? buildWeekDays(selectedDate) : buildCalendarDays(monthDate);
  const headerTitle = isWeek
    ? formatWeekRange(days)
    : `${monthDate.toLocaleString("default", { month: "long" })} ${monthDate.getFullYear()}`;
  const handlePrev = isWeek ? onPrevWeek : onPrevMonth;
  const handleNext = isWeek ? onNextWeek : onNextMonth;
  const maxEvents = isWeek ? 5 : 2;

  return (
    <section className="calendar">
      <header className="calendar__header">
        <button type="button" onClick={handlePrev}>&#8592;</button>
        <h2>{headerTitle}</h2>
        <div className="calendar__header-right">
          <div className="calendar__view-toggle">
            <button
              type="button"
              className={`calendar__view-btn${!isWeek ? " calendar__view-btn--active" : ""}`}
              onClick={() => onViewChange("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`calendar__view-btn${isWeek ? " calendar__view-btn--active" : ""}`}
              onClick={() => onViewChange("week")}
            >
              Week
            </button>
          </div>
          <button type="button" onClick={handleNext}>&#8594;</button>
        </div>
      </header>
      <div className="calendar__weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="calendar__weekday">
            {label}
          </div>
        ))}
      </div>
      <div className={`calendar__grid${isWeek ? " calendar__grid--week" : ""}`}>
        {days.map((day) => {
          const isoDate = formatDate(day);
          const isCurrentMonth = isWeek ? true : day.getMonth() === month;
          const isSelected = isoDate === selectedDate;
          const isToday = isoDate === TODAY;
          const hasTasks = (tasksByDate[isoDate] || []).length > 0;
          const dayEvents = (eventsByDate || {})[isoDate] || [];
          const visibleEvents = dayEvents.slice(0, maxEvents);

          return (
            <button
              key={isoDate}
              type="button"
              className={
                "calendar__day" +
                (isCurrentMonth ? "" : " calendar__day--muted") +
                (isSelected ? " calendar__day--selected" : "") +
                (isToday ? " calendar__day--today" : "")
              }
              onClick={() => onSelectDate(isoDate)}
            >
              <span className="calendar__day-number">{day.getDate()}</span>
              <span className="calendar__day-body">
                {visibleEvents.map((event) => (
                  <span key={event.id} className="calendar__event-chip">
                    {event.time ? (
                      <span className="calendar__event-time">{event.time} </span>
                    ) : null}
                    {event.title}
                  </span>
                ))}
              </span>
              {hasTasks ? <span className="calendar__dot" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
