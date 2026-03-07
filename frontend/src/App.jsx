import React, { useEffect, useMemo, useState } from "react";
import Calendar from "./components/Calendar.jsx";
import DayTasks from "./components/DayTasks.jsx";
import DayEvents from "./components/DayEvents.jsx";
import ShoppingList from "./components/ShoppingList.jsx";
import GoalList from "./components/GoalList.jsx";
import LongTermTodos from "./components/LongTermTodos.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { createTask, deleteTask, fetchTasks, updateTask, fetchEvents, createEvent, updateEvent, deleteEvent } from "./api/client.js";
import { groupTasksByDate, groupEventsByDate } from "./state/tasks.js";

function toMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const monthKey = useMemo(() => toMonthKey(monthDate), [monthDate]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    Promise.all([fetchTasks(monthKey), fetchEvents(monthKey)])
      .then(([taskData, eventData]) => {
        if (!isActive) return;
        setTasks(taskData);
        setEvents(eventData);
        setError(null);
      })
      .catch((err) => { if (!isActive) return; setError(err.message || "Failed to load"); })
      .finally(() => { if (!isActive) return; setLoading(false); });
    return () => { isActive = false; };
  }, [monthKey]);

  const handlePrevMonth = () => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
    setMonthDate(next);
    setSelectedDate(toDateKey(next));
  };

  const handleNextMonth = () => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    setMonthDate(next);
    setSelectedDate(toDateKey(next));
  };

  const handleAdd = async (payload) => {
    const created = await createTask(payload);
    setTasks((prev) => [...prev, created]);
  };

  const handleUpdate = async (id, payload) => {
    const result = await updateTask(id, payload);
    const updated = result.task || result;
    const newTask = result.newTask || null;
    setTasks((prev) => {
      const mapped = prev.map((task) => (task.id === id ? updated : task));
      if (newTask && newTask.date.startsWith(monthKey)) return [...mapped, newTask];
      return mapped;
    });
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleAddEvent = async (payload) => {
    const created = await createEvent(payload);
    setEvents((prev) => [...prev, created]);
  };

  const handleUpdateEvent = async (id, payload) => {
    const updated = await updateEvent(id, payload);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  const handleDeleteEvent = async (id) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const dayTasks = tasksByDate[selectedDate] || [];
  const dayEvents = eventsByDate[selectedDate] || [];

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-brand">
          <h1>Oikonomos</h1>
          <span className="app__header-sub">Your personal planner</span>
        </div>
      </header>

      <GoalList />

      <main className="app__main">
        <div className="app__left">
          <Calendar
            monthDate={monthDate}
            tasksByDate={tasksByDate}
            eventsByDate={eventsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
          <LongTermTodos />
          <ShoppingList />
        </div>
        <section className="app__panel">
          {loading ? <p className="app__loading">Loading…</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <DayTasks
            date={selectedDate}
            tasks={dayTasks}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
          <DayEvents
            date={selectedDate}
            events={dayEvents}
            onAdd={handleAddEvent}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
          />
        </section>
      </main>
      <ChatWidget selectedDate={selectedDate} />
    </div>
  );
}
