import React, { useMemo, useState } from "react";
import { parseTags } from "../state/tasks.js";

function tagsToString(tags) {
  return (tags || []).join(", ");
}

export default function DayTasks({
  date,
  tasks,
  onAdd,
  onUpdate,
  onDelete
}) {
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.id - b.id);
  }, [tasks]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    onAdd({
      title: title.trim(),
      date,
      tags: parseTags(tagsInput)
    });
    setTitle("");
    setTagsInput("");
  };

  const beginEdit = (task) => {
    setEditId(task.id);
    setEditTitle(task.title);
    setEditTagsInput(tagsToString(task.tags));
  };

  const handleEditSave = (task) => {
    onUpdate(task.id, {
      title: editTitle.trim(),
      date,
      completed: task.completed,
      tags: parseTags(editTagsInput)
    });
    setEditId(null);
  };

  const handleToggle = (task) => {
    onUpdate(task.id, {
      title: task.title,
      date: task.date,
      completed: !task.completed,
      tags: task.tags
    });
  };

  return (
    <section className="day">
      <h3>
        {date} <span className="day__count">{tasks.length} tasks</span>
      </h3>
      <form className="day__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task"
        />
        <input
          type="text"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="Tags (comma separated)"
        />
        <button type="submit">Add</button>
      </form>
      <div className="day__list">
        {sortedTasks.map((task) => (
          <div key={task.id} className="day__item">
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task)}
              />
              {editId === task.id ? (
                <input
                  className="day__edit"
                  type="text"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              ) : (
                <span className={task.completed ? "is-done" : ""}>
                  {task.title}
                </span>
              )}
            </label>
            {editId === task.id ? (
              <input
                className="day__edit"
                type="text"
                value={editTagsInput}
                onChange={(event) => setEditTagsInput(event.target.value)}
                placeholder="Tags"
              />
            ) : (
              <div className="day__tags">
                {(task.tags || []).map((tag) => (
                  <span key={tag} className="day__tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="day__actions">
              {editId === task.id ? (
                <>
                  <button type="button" onClick={() => handleEditSave(task)}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => beginEdit(task)}>
                  Edit
                </button>
              )}
              <button type="button" onClick={() => onDelete(task.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
