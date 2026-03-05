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

export default function Calendar({
  monthDate,
  tasksByDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth
}) {
  const days = buildCalendarDays(monthDate);
  const month = monthDate.getMonth();

  return (
    <section className="calendar">
      <header className="calendar__header">
        <button type="button" onClick={onPrevMonth}>
          
        </button>
        <h2>
          {monthDate.toLocaleString("default", { month: "long" })} {" "}
          {monthDate.getFullYear()}
        </h2>
        <button type="button" onClick={onNextMonth}>
          
        </button>
      </header>
      <div className="calendar__weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <div key={label} className="calendar__weekday">
            {label}
          </div>
        ))}
      </div>
      <div className="calendar__grid">
        {days.map((day) => {
          const isoDate = formatDate(day);
          const isCurrentMonth = day.getMonth() === month;
          const isSelected = isoDate === selectedDate;
          const hasTasks = (tasksByDate[isoDate] || []).length > 0;

          return (
            <button
              key={isoDate}
              type="button"
              className={
                "calendar__day" +
                (isCurrentMonth ? "" : " calendar__day--muted") +
                (isSelected ? " calendar__day--selected" : "")
              }
              onClick={() => onSelectDate(isoDate)}
            >
              <span className="calendar__day-number">{day.getDate()}</span>
              {hasTasks ? <span className="calendar__dot" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
