import React, { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "./components/Calendar.jsx";
import DayTasks from "./components/DayTasks.jsx";
import DayEvents from "./components/DayEvents.jsx";
import ShoppingList from "./components/ShoppingList.jsx";
import GoalList from "./components/GoalList.jsx";
import LongTermTodos from "./components/LongTermTodos.jsx";
import ChatPage from "./components/ChatPage.jsx";
import SummaryPage from "./components/SummaryPage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import NavBar from "./components/NavBar.jsx";
import { createTask, deleteTask, fetchTasks, updateTask, reorderTasks, fetchEvents, createEvent, updateEvent, deleteEvent } from "./api/client.js";
import { groupTasksByDate, groupEventsByDate } from "./state/tasks.js";
import { getGoogleStatus, triggerSync } from "./api/settingsClient.js";

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

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export default function App() {
  const [activePage, setActivePage] = useState("calendar");
  const [calendarView, setCalendarView] = useState("month");
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const monthKey = useMemo(() => toMonthKey(monthDate), [monthDate]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  // In week view a single week can span two months — collect both month keys
  const fetchKeys = useMemo(() => {
    if (calendarView !== "week") return [monthKey];
    const d = new Date(selectedDate + "T00:00:00");
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const a = toMonthKey(sunday);
    const b = toMonthKey(saturday);
    return a === b ? [a] : [a, b];
  }, [calendarView, selectedDate, monthKey]);

  // Keep a ref so the interval closure always reads the latest monthKey
  const monthKeyRef = useRef(monthKey);
  useEffect(() => { monthKeyRef.current = monthKey; }, [monthKey]);

  // Auto-sync from Google Calendar on load and every 5 minutes
  useEffect(() => {
    let cancelled = false;
    async function autoSync() {
      try {
        const status = await getGoogleStatus();
        if (!status?.connected || cancelled) return;
        await triggerSync();
        if (cancelled) return;
        const [taskData, eventData] = await Promise.all([
          fetchTasks(monthKeyRef.current),
          fetchEvents(monthKeyRef.current),
        ]);
        if (cancelled) return;
        setTasks(taskData);
        setEvents(eventData);
      } catch {
        // Silent failure — runs in background, must not disrupt the UI
      }
    }
    autoSync();
    const interval = setInterval(autoSync, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    const dedup = (arr) => [...new Map(arr.map((x) => [x.id, x])).values()];
    Promise.all(fetchKeys.flatMap((mk) => [fetchTasks(mk), fetchEvents(mk)]))
      .then((results) => {
        if (!isActive) return;
        const allTasks = dedup(fetchKeys.flatMap((_, i) => results[i * 2]));
        const allEvents = dedup(fetchKeys.flatMap((_, i) => results[i * 2 + 1]));
        setTasks(allTasks);
        setEvents(allEvents);
        setError(null);
      })
      .catch((err) => { if (!isActive) return; setError(err.message || "Failed to load"); })
      .finally(() => { if (!isActive) return; setLoading(false); });
    return () => { isActive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKeys.join(",")]);

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

  const handlePrevWeek = () => {
    const newDate = addDays(selectedDate, -7);
    setSelectedDate(newDate);
    const d = new Date(newDate + "T00:00:00");
    const newMonthKey = toMonthKey(d);
    if (newMonthKey !== monthKey) {
      setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleNextWeek = () => {
    const newDate = addDays(selectedDate, 7);
    setSelectedDate(newDate);
    const d = new Date(newDate + "T00:00:00");
    const newMonthKey = toMonthKey(d);
    if (newMonthKey !== monthKey) {
      setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
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

  const handleReorder = async (orderedIds) => {
    setTasks((prev) => {
      const posMap = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((t) => posMap.has(t.id) ? { ...t, position: posMap.get(t.id) } : t);
    });
    await reorderTasks(orderedIds);
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

  const handleRefresh = () => {
    setLoading(true);
    const dedup = (arr) => [...new Map(arr.map((x) => [x.id, x])).values()];
    Promise.all(fetchKeys.flatMap((mk) => [fetchTasks(mk), fetchEvents(mk)]))
      .then((results) => {
        const allTasks = dedup(fetchKeys.flatMap((_, i) => results[i * 2]));
        const allEvents = dedup(fetchKeys.flatMap((_, i) => results[i * 2 + 1]));
        setTasks(allTasks);
        setEvents(allEvents);
        setError(null);
      })
      .catch((err) => setError(err.message || "Failed to load"))
      .finally(() => setLoading(false));
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

      <div className={`page-content${activePage === "chat" ? " page-content--chat" : ""}`}>
        {activePage === "calendar" && (
          <>
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
                  view={calendarView}
                  onViewChange={setCalendarView}
                  onPrevWeek={handlePrevWeek}
                  onNextWeek={handleNextWeek}
                />
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
                  onReorder={handleReorder}
                />
                <DayEvents
                  date={selectedDate}
                  events={dayEvents}
                  onAdd={handleAddEvent}
                  onUpdate={handleUpdateEvent}
                  onDelete={handleDeleteEvent}
                />
              </section>
              <div className="app__secondary">
                <LongTermTodos />
                <ShoppingList />
              </div>
            </main>
          </>
        )}

        {activePage === "chat" && <ChatPage selectedDate={selectedDate} onRefresh={handleRefresh} />}
        {activePage === "summary" && <SummaryPage />}
        {activePage === "settings" && <SettingsPage />}
      </div>

      <NavBar activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}
