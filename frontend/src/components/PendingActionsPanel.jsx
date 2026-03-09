import React from "react";

const TYPE_LABELS = {
  add_task: "New Task",
  add_event: "New Event",
  add_shopping_item: "Shopping Item",
  add_goal: "New Goal",
  add_long_term_todo: "Long-term Todo",
};

function PendingAction({ action, params, onEditParam, onRemove }) {
  const { id, type } = action;

  const field = (key, label, inputEl) => (
    <div className="pending-field" key={key}>
      <label>{label}</label>
      {inputEl}
    </div>
  );

  const textInput = (key, label, placeholder = "") =>
    field(key, label,
      <input
        type="text"
        value={params[key] || ""}
        placeholder={placeholder}
        onChange={(e) => onEditParam(id, key, e.target.value)}
      />
    );

  const tagsValue = Array.isArray(params.tags) ? params.tags.join(", ") : (params.tags || "");

  return (
    <div className="pending-action">
      <div className="pending-action__header">
        <span className="pending-action__type">{TYPE_LABELS[type] || type}</span>
        <button className="pending-action__remove" onClick={() => onRemove(id)} aria-label="Remove">×</button>
      </div>
      <div className="pending-action__fields">
        {(type === "add_task" || type === "add_event") && (
          <>
            {textInput("title", "Title")}
            {field("date", "Date",
              <input
                type="date"
                value={params.date || ""}
                onChange={(e) => onEditParam(id, "date", e.target.value)}
              />
            )}
            {type === "add_event" && field("time", "Time (optional)",
              <input
                type="time"
                value={params.time || ""}
                onChange={(e) => onEditParam(id, "time", e.target.value)}
              />
            )}
            {field("description", "Description (optional)",
              <textarea
                value={params.description || ""}
                onChange={(e) => onEditParam(id, "description", e.target.value)}
              />
            )}
            {type === "add_task" && field("tags", "Tags (comma-separated)",
              <input
                type="text"
                value={tagsValue}
                placeholder="e.g. shopping, urgent"
                onChange={(e) => onEditParam(id, "tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
              />
            )}
          </>
        )}
        {type === "add_shopping_item" && (
          <>
            {textInput("name", "Item name")}
            {field("type", "Type",
              <div className="pending-type-toggle">
                <button
                  className={params.type !== "wanted" ? "active" : ""}
                  onClick={() => onEditParam(id, "type", "needed")}
                >Needed</button>
                <button
                  className={params.type === "wanted" ? "active" : ""}
                  onClick={() => onEditParam(id, "type", "wanted")}
                >Wanted</button>
              </div>
            )}
          </>
        )}
        {(type === "add_goal" || type === "add_long_term_todo") && (
          textInput("title", "Title")
        )}
      </div>
    </div>
  );
}

export default function PendingActionsPanel({
  actions,
  editedParams,
  onEditParam,
  onRemove,
  onConfirm,
  onDismiss,
  confirming,
}) {
  if (actions.length === 0) return null;

  return (
    <div className="pending-panel">
      <div className="pending-panel__header">Proposed Actions</div>
      <div className="pending-panel__subtitle">Review and edit before saving</div>
      <div className="pending-panel__list">
        {actions.map((action) => (
          <PendingAction
            key={action.id}
            action={action}
            params={editedParams[action.id] || action.params}
            onEditParam={onEditParam}
            onRemove={onRemove}
          />
        ))}
      </div>
      <div className="pending-panel__footer">
        <button className="pending-panel__btn pending-panel__btn--ghost" onClick={onDismiss} disabled={confirming}>
          Discard all
        </button>
        <button className="pending-panel__btn pending-panel__btn--primary" onClick={onConfirm} disabled={confirming}>
          {confirming ? "Saving…" : `Save ${actions.length} item${actions.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
