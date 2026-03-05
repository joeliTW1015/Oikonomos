import React, { useEffect, useMemo, useState } from "react";
import Calendar from "./components/Calendar.jsx";
import DayTasks from "./components/DayTasks.jsx";
import { createTask, deleteTask, fetchTasks, updateTask } from "./api/client.js";
import { groupTasksByDate } from "./state/tasks.js";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const monthKey = useMemo(() => toMonthKey(monthDate), [monthDate]);
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    fetchTasks(monthKey)
      .then((data) => {
        if (!isActive) {
          return;
        }
        setTasks(data);
        setError(null);
      })
      .catch((err) => {
        if (!isActive) {
          return;
        }
        setError(err.message || "Failed to load");
      })
      .finally(() => {
        if (!isActive) {
          return;
        }
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
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
    const updated = await updateTask(id, payload);
    setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const dayTasks = tasksByDate[selectedDate] || [];

  return (
    <div className="app">
      <header className="app__header">
        <h1>Calendar + Todo</h1>
        <p>Plan your tasks and tag them by day.</p>
      </header>
      <main className="app__main">
        <Calendar
          monthDate={monthDate}
          tasksByDate={tasksByDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
        <section className="app__panel">
          {loading ? <p>Loading...</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <DayTasks
            date={selectedDate}
            tasks={dayTasks}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>
      </main>
    </div>
  );
}
