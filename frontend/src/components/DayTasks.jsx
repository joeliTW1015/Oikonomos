import React, { useMemo, useState } from "react";
import { CheckCircle2, XCircle, CalendarClock, History } from "lucide-react";
import { parseTags } from "../state/tasks.js";
import { fetchTaskHistory } from "../api/client.js";

function tagsToString(tags) {
  return (tags || []).join(", ");
}

const STATUS_ICONS = {
  success: <CheckCircle2 size={11} />,
  failure: <XCircle size={11} />,
  postponed: <CalendarClock size={11} />
};
const STATUS_LABELS = { success: "Success", failure: "Failure", postponed: "Postponed" };

function StatusBadge({ status }) {
  if (status === "pending") return null;
  return (
    <span className={`status-badge status-badge--${status}`}>
      {STATUS_ICONS[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function DayTasks({ date, tasks, onAdd, onUpdate, onDelete }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");

  // { id, type: 'success'|'failure'|'postponed', note, postponeDate }
  const [statusAction, setStatusAction] = useState(null);

  const [historyTaskId, setHistoryTaskId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => a.id - b.id), [tasks]);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // ── Add form ──────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim() || null, date, tags: parseTags(tagsInput) });
    setTitle("");
    setDescription("");
    setTagsInput("");
  };

  // ── Edit ──────────────────────────────────────────────────────
  const beginEdit = (task) => {
    setEditId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditTagsInput(tagsToString(task.tags));
    setStatusAction(null);
  };

  const handleEditSave = (task) => {
    onUpdate(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      date,
      tags: parseTags(editTagsInput)
    });
    setEditId(null);
  };

  // ── Status action ─────────────────────────────────────────────
  const openStatusAction = (task, type) => {
    setEditId(null);
    setHistoryTaskId(null);
    setStatusAction({ id: task.id, type, note: "", postponeDate: tomorrow });
  };

  const confirmStatus = () => {
    const { id, type, note, postponeDate } = statusAction;
    onUpdate(id, {
      status: type,
      note: note.trim() || null,
      ...(type === "postponed" ? { postponeDate } : {})
    });
    setStatusAction(null);
  };

  // ── History ───────────────────────────────────────────────────
  const toggleHistory = async (task) => {
    if (historyTaskId === task.id) {
      setHistoryTaskId(null);
      return;
    }
    setHistoryTaskId(task.id);
    setHistoryLoading(true);
    try {
      const data = await fetchTaskHistory(task.id);
      setHistory(data);
    } finally {
      setHistoryLoading(false);
    }
  };

  const hasChain = (task) => task.originTaskId || task.postponeCount > 0;

  return (
    <section className="day">
      <h3>
        {date} <span className="day__count">{tasks.length} tasks</span>
      </h3>

      <form className="day__form" onSubmit={handleSubmit}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
        <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags (comma separated)" />
        <button type="submit">Add</button>
      </form>

      <div className="day__list">
        {sortedTasks.map((task) => (
          <div
            key={task.id}
            className={"day__item" + (task.status !== "pending" ? " day__item--resolved" : "")}
          >
            {/* Title row */}
            <div className="day__item-header">
              <StatusBadge status={task.status} />
              {editId === task.id ? (
                <input
                  className="day__edit"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              ) : (
                <span className={task.status === "success" ? "is-done" : ""}>{task.title}</span>
              )}
            </div>

            {/* Note (set when completing) */}
            {task.note && editId !== task.id ? (
              <p className="day__note">"{task.note}"</p>
            ) : null}

            {/* Description */}
            {editId === task.id ? (
              <input
                className="day__edit"
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
              />
            ) : task.description ? (
              <p className="day__description">{task.description}</p>
            ) : null}

            {/* Tags */}
            {editId === task.id ? (
              <input
                className="day__edit"
                type="text"
                value={editTagsInput}
                onChange={(e) => setEditTagsInput(e.target.value)}
                placeholder="Tags"
              />
            ) : (
              <div className="day__tags">
                {(task.tags || []).map((tag) => (
                  <span key={tag} className="day__tag">{tag}</span>
                ))}
              </div>
            )}

            {/* Inline status action form */}
            {statusAction?.id === task.id ? (
              <div className="day__status-form">
                <p className="day__status-form-label">
                  {statusAction.type === "success" && "Add a tip or note for this success (optional)"}
                  {statusAction.type === "failure" && "Why did this fail? (optional)"}
                  {statusAction.type === "postponed" && "Why are you postponing? (optional)"}
                </p>
                <textarea
                  className="day__status-note"
                  value={statusAction.note}
                  onChange={(e) => setStatusAction((s) => ({ ...s, note: e.target.value }))}
                  placeholder="Note..."
                  rows={2}
                />
                {statusAction.type === "postponed" && (
                  <div className="day__status-date">
                    <label>Reschedule to:</label>
                    <input
                      type="date"
                      min={tomorrow}
                      value={statusAction.postponeDate}
                      onChange={(e) => setStatusAction((s) => ({ ...s, postponeDate: e.target.value }))}
                    />
                  </div>
                )}
                <div className="day__actions">
                  <button
                    type="button"
                    className={`btn-confirm btn-confirm--${statusAction.type}`}
                    onClick={confirmStatus}
                    disabled={statusAction.type === "postponed" && !statusAction.postponeDate}
                  >
                    Confirm
                  </button>
                  <button type="button" onClick={() => setStatusAction(null)}>Cancel</button>
                </div>
              </div>
            ) : null}

            {/* History panel */}
            {historyTaskId === task.id ? (
              <div className="day__history">
                <h4>Postponement History</h4>
                {historyLoading ? (
                  <p>Loading...</p>
                ) : (
                  history.map((h, i) => (
                    <div key={h.id} className="day__history-item">
                      <div className="day__history-meta">
                        <span className="day__history-step">#{i + 1}</span>
                        <span className="day__history-date">{h.date}</span>
                        <StatusBadge status={h.status} />
                      </div>
                      {h.note ? <p className="day__note">"{h.note}"</p> : null}
                      {h.status === "postponed" && h.postponeDate ? (
                        <p className="day__history-postpone">↷ Rescheduled to {h.postponeDate}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {/* Actions */}
            <div className="day__actions">
              {task.status === "pending" && editId !== task.id && statusAction?.id !== task.id ? (
                <>
                  <button type="button" className="btn-status btn-status--success" title="Mark as Success" onClick={() => openStatusAction(task, "success")}>
                    <CheckCircle2 size={16} />
                  </button>
                  <button type="button" className="btn-status btn-status--failure" title="Mark as Failure" onClick={() => openStatusAction(task, "failure")}>
                    <XCircle size={16} />
                  </button>
                  <button type="button" className="btn-status btn-status--postpone" title="Postpone" onClick={() => openStatusAction(task, "postponed")}>
                    <CalendarClock size={16} />
                  </button>
                </>
              ) : null}

              {editId === task.id ? (
                <>
                  <button type="button" onClick={() => handleEditSave(task)}>Save</button>
                  <button type="button" onClick={() => setEditId(null)}>Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => beginEdit(task)}>Edit</button>
              )}

              {hasChain(task) ? (
                <button
                  type="button"
                  title="View postponement history"
                  className={"btn-icon" + (historyTaskId === task.id ? " btn-history-active" : "")}
                  onClick={() => toggleHistory(task)}
                >
                  <History size={15} />
                </button>
              ) : null}

              <button type="button" onClick={() => onDelete(task.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
