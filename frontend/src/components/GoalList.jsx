import React, { useEffect, useRef, useState } from "react";
import { Target, Plus, X, Check } from "lucide-react";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "../api/client.js";

export default function GoalList() {
  const [goals, setGoals] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    fetchGoals().then(setGoals).catch(() => {});
  }, []);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!draft.trim()) { setAdding(false); return; }
    const created = await createGoal({ title: draft.trim() });
    setGoals((prev) => [...prev, created]);
    setDraft("");
    setAdding(false);
  };

  const handleToggle = async (goal) => {
    const updated = await updateGoal(goal.id, { done: !goal.done });
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
  };

  const handleDelete = async (id) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const active = goals.filter((g) => !g.done);
  const done   = goals.filter((g) =>  g.done);

  return (
    <section className="goals">
      <div className="goals__header">
        <span className="goals__title">
          <Target size={16} />
          Current Focus
        </span>
        <button className="goals__add-btn" onClick={() => setAdding(true)} title="Add goal">
          <Plus size={15} />
          Add goal
        </button>
      </div>

      <div className="goals__board">
        {active.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onToggle={handleToggle} onDelete={handleDelete} />
        ))}

        {adding && (
          <form className="goals__card goals__card--draft" onSubmit={handleAdd}>
            <input
              ref={inputRef}
              className="goals__draft-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What's your focus?"
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
            />
            <div className="goals__draft-actions">
              <button type="submit" className="goals__confirm-btn">Add</button>
              <button type="button" className="goals__cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        )}

        {goals.length === 0 && !adding && (
          <p className="goals__empty">No current goals. Click "Add goal" to start.</p>
        )}

        {done.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onToggle={handleToggle} onDelete={handleDelete} />
        ))}
      </div>
    </section>
  );
}

function GoalCard({ goal, onToggle, onDelete }) {
  return (
    <div className={"goals__card" + (goal.done ? " goals__card--done" : "")}>
      <button
        type="button"
        className={"goals__check" + (goal.done ? " goals__check--done" : "")}
        onClick={() => onToggle(goal)}
        aria-label="Toggle"
      >
        {goal.done ? <Check size={11} /> : null}
      </button>
      <span className="goals__card-title">{goal.title}</span>
      <button
        type="button"
        className="goals__delete"
        onClick={() => onDelete(goal.id)}
        aria-label="Delete"
      >
        <X size={13} />
      </button>
    </div>
  );
}
