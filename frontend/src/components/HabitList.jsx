import React, { useEffect, useState } from "react";
import { CheckSquare, Square, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { fetchHabits, createHabit, updateHabit, deleteHabit, toggleHabitCompletion } from "../api/client.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NUMS = [0, 1, 2, 3, 4, 5, 6];

function frequencyLabel(frequency) {
  if (frequency === "daily") return "Daily";
  const days = frequency.split(",").map((d) => DAY_NAMES[Number(d)]).filter(Boolean);
  return days.join(" · ");
}

export default function HabitList({ date }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addFrequency, setAddFrequency] = useState("daily");
  const [addDays, setAddDays] = useState([]);

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFrequency, setEditFrequency] = useState("daily");
  const [editDays, setEditDays] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetchHabits(date)
      .then(setHabits)
      .finally(() => setLoading(false));
  }, [date]);

  const handleToggle = async (habit) => {
    const result = await toggleHabitCompletion(habit.id, date);
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, done: result.done } : h))
    );
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addTitle.trim()) return;
    const freq = addFrequency === "weekly" ? addDays.sort((a, b) => a - b).join(",") : "daily";
    const created = await createHabit({ title: addTitle.trim(), frequency: freq });
    // Re-fetch to apply day filter correctly
    const updated = await fetchHabits(date);
    setHabits(updated);
    setAddTitle("");
    setAddDays([]);
    setAddFrequency("daily");
    setShowAdd(false);
    // If the new habit wasn't in the filtered list, it still exists
    if (!updated.find((h) => h.id === created.id)) {
      // It applies on a different day — don't add to list
    }
  };

  const beginEdit = (habit) => {
    setEditId(habit.id);
    setEditTitle(habit.title);
    if (habit.frequency === "daily") {
      setEditFrequency("daily");
      setEditDays([]);
    } else {
      setEditFrequency("weekly");
      setEditDays(habit.frequency.split(",").map(Number));
    }
  };

  const handleEditSave = async (habit) => {
    const freq = editFrequency === "weekly" ? editDays.sort((a, b) => a - b).join(",") : "daily";
    await updateHabit(habit.id, { title: editTitle.trim(), frequency: freq });
    const updated = await fetchHabits(date);
    setHabits(updated);
    setEditId(null);
  };

  const handleDelete = async (id) => {
    await deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleAddDay = (day) => {
    setAddDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleEditDay = (day) => {
    setEditDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <section className="habits">
      <div className="habits__header">
        <span className="habits__title">
          <CheckSquare size={14} />
          Habits
        </span>
        <button
          type="button"
          className="habits__add-btn"
          onClick={() => setShowAdd((s) => !s)}
          title="Add habit"
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      {showAdd && (
        <form className="habits__form" onSubmit={handleAdd}>
          <input
            type="text"
            className="habits__form-input"
            placeholder="Habit name"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            autoFocus
          />
          <div className="habits__freq-row">
            <label className="habits__freq-label">
              <input
                type="radio"
                name="add-freq"
                checked={addFrequency === "daily"}
                onChange={() => { setAddFrequency("daily"); setAddDays([]); }}
              />
              Daily
            </label>
            <label className="habits__freq-label">
              <input
                type="radio"
                name="add-freq"
                checked={addFrequency === "weekly"}
                onChange={() => setAddFrequency("weekly")}
              />
              Weekly
            </label>
          </div>
          {addFrequency === "weekly" && (
            <div className="habits__days-picker">
              {DAY_NUMS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`habits__day-btn${addDays.includes(d) ? " habits__day-btn--on" : ""}`}
                  onClick={() => toggleAddDay(d)}
                >
                  {DAY_NAMES[d]}
                </button>
              ))}
            </div>
          )}
          <div className="habits__form-actions">
            <button type="submit" className="habits__confirm-btn">
              <Check size={13} /> Save
            </button>
            <button type="button" className="habits__cancel-btn" onClick={() => setShowAdd(false)}>
              <X size={13} /> Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="habits__empty">Loading…</p>
      ) : habits.length === 0 ? (
        <p className="habits__empty">No habits for this day.</p>
      ) : (
        <ul className="habits__list">
          {habits.map((habit) => (
            <li key={habit.id} className={`habits__item${habit.done ? " habits__item--done" : ""}`}>
              {editId === habit.id ? (
                <div className="habits__edit">
                  <input
                    type="text"
                    className="habits__form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <div className="habits__freq-row">
                    <label className="habits__freq-label">
                      <input
                        type="radio"
                        name={`edit-freq-${habit.id}`}
                        checked={editFrequency === "daily"}
                        onChange={() => { setEditFrequency("daily"); setEditDays([]); }}
                      />
                      Daily
                    </label>
                    <label className="habits__freq-label">
                      <input
                        type="radio"
                        name={`edit-freq-${habit.id}`}
                        checked={editFrequency === "weekly"}
                        onChange={() => setEditFrequency("weekly")}
                      />
                      Weekly
                    </label>
                  </div>
                  {editFrequency === "weekly" && (
                    <div className="habits__days-picker">
                      {DAY_NUMS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`habits__day-btn${editDays.includes(d) ? " habits__day-btn--on" : ""}`}
                          onClick={() => toggleEditDay(d)}
                        >
                          {DAY_NAMES[d]}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="habits__form-actions">
                    <button type="button" className="habits__confirm-btn" onClick={() => handleEditSave(habit)}>
                      <Check size={13} /> Save
                    </button>
                    <button type="button" className="habits__cancel-btn" onClick={() => setEditId(null)}>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="habits__check"
                    onClick={() => handleToggle(habit)}
                    title={habit.done ? "Mark undone" : "Mark done"}
                  >
                    {habit.done ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <span className="habits__item-title">{habit.title}</span>
                  <span className="habits__freq-badge">{frequencyLabel(habit.frequency)}</span>
                  <div className="habits__item-actions">
                    <button
                      type="button"
                      className="habits__icon-btn"
                      title="Edit"
                      onClick={() => beginEdit(habit)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="habits__icon-btn habits__icon-btn--danger"
                      title="Delete"
                      onClick={() => handleDelete(habit.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
