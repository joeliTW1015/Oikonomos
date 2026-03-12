import React from "react";
import WeekGrid from "./WeekGrid.jsx";

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

  return (
    <section className="calendar">
      <header className="calendar__header">
        <button type="button" className="calendar__nav-btn" onClick={handlePrev}>&#8592;</button>
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
          <button type="button" className="calendar__nav-btn" onClick={handleNext}>&#8594;</button>
        </div>
      </header>
      {isWeek ? (
        <WeekGrid
          days={days}
          eventsByDate={eventsByDate}
          tasksByDate={tasksByDate}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      ) : (
        <>
          <div className="calendar__weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
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
              const isToday = isoDate === TODAY;
              const dayTasks = tasksByDate[isoDate] || [];

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
                    {dayTasks.map((task) => (
                      <span
                        key={task.id}
                        className={`calendar__task-dot calendar__task-dot--${task.status}`}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
