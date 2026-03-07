import React, { useEffect, useRef, useState } from "react";
import { ListTodo, Plus, X, Check } from "lucide-react";
import { fetchLongTermTodos, createLongTermTodo, updateLongTermTodo, deleteLongTermTodo } from "../api/client.js";

export default function LongTermTodos() {
  const [todos, setTodos] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    fetchLongTermTodos().then(setTodos).catch(() => {});
  }, []);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!draft.trim()) { setAdding(false); return; }
    const created = await createLongTermTodo({ title: draft.trim() });
    setTodos((prev) => [...prev, created]);
    setDraft("");
    setAdding(false);
  };

  const handleToggle = async (todo) => {
    const updated = await updateLongTermTodo(todo.id, { done: !todo.done });
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
  };

  const handleDelete = async (id) => {
    await deleteLongTermTodo(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const active = todos.filter((t) => !t.done);
  const done   = todos.filter((t) =>  t.done);

  return (
    <section className="lttodos">
      <div className="lttodos__header">
        <span className="lttodos__title">
          <ListTodo size={16} />
          長期待辦事項
        </span>
        <button className="lttodos__add-btn" onClick={() => setAdding(true)} title="新增待辦">
          <Plus size={15} />
          新增
        </button>
      </div>

      <ul className="lttodos__list">
        {active.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
        ))}

        {adding && (
          <li className="lttodos__item lttodos__item--draft">
            <form className="lttodos__draft-form" onSubmit={handleAdd}>
              <input
                ref={inputRef}
                className="lttodos__draft-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="輸入待辦事項…"
                onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
              />
              <div className="lttodos__draft-actions">
                <button type="submit" className="lttodos__confirm-btn">新增</button>
                <button type="button" className="lttodos__cancel-btn" onClick={() => setAdding(false)}>取消</button>
              </div>
            </form>
          </li>
        )}

        {todos.length === 0 && !adding && (
          <li className="lttodos__empty">尚無長期待辦事項。點擊「新增」開始記錄。</li>
        )}

        {done.length > 0 && (
          <>
            <li className="lttodos__divider">已完成</li>
            {done.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </>
        )}
      </ul>
    </section>
  );
}

function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={"lttodos__item" + (todo.done ? " lttodos__item--done" : "")}>
      <button
        type="button"
        className={"lttodos__check" + (todo.done ? " lttodos__check--done" : "")}
        onClick={() => onToggle(todo)}
        aria-label="Toggle"
      >
        {todo.done ? <Check size={11} /> : null}
      </button>
      <span className="lttodos__item-title">{todo.title}</span>
      <button
        type="button"
        className="lttodos__delete"
        onClick={() => onDelete(todo.id)}
        aria-label="Delete"
      >
        <X size={13} />
      </button>
    </li>
  );
}
