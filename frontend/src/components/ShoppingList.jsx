import React, { useEffect, useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import {
  fetchShoppingItems,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem
} from "../api/client.js";

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("needed");

  useEffect(() => {
    fetchShoppingItems().then(setItems).catch(() => {});
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const created = await createShoppingItem({ name: name.trim(), type });
    setItems((prev) => [...prev, created]);
    setName("");
  };

  const handleToggle = async (item) => {
    const updated = await updateShoppingItem(item.id, { done: !item.done });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  };

  const handleDelete = async (id) => {
    await deleteShoppingItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const needed = items.filter((i) => i.type === "needed");
  const wanted = items.filter((i) => i.type === "wanted");

  return (
    <section className="shopping">
      <h3 className="shopping__title">
        <ShoppingCart size={16} />
        Shopping List
      </h3>

      <form className="shopping__form" onSubmit={handleAdd}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add an item…"
        />
        <div className="shopping__type-toggle">
          <button
            type="button"
            className={"shopping__type-btn" + (type === "needed" ? " shopping__type-btn--active-needed" : "")}
            onClick={() => setType("needed")}
          >
            Needed
          </button>
          <button
            type="button"
            className={"shopping__type-btn" + (type === "wanted" ? " shopping__type-btn--active-wanted" : "")}
            onClick={() => setType("wanted")}
          >
            Wanted
          </button>
        </div>
        <button type="submit" className="shopping__add-btn">Add</button>
      </form>

      <div className="shopping__sections">
        <ShoppingSection title="Needed" items={needed} onToggle={handleToggle} onDelete={handleDelete} />
        <ShoppingSection title="Wanted" items={wanted} onToggle={handleToggle} onDelete={handleDelete} />
      </div>
    </section>
  );
}

function ShoppingSection({ title, items, onToggle, onDelete }) {
  if (items.length === 0) return null;
  return (
    <div className="shopping__section">
      <p className="shopping__section-label">{title}</p>
      <ul className="shopping__list">
        {items.map((item) => (
          <li key={item.id} className={"shopping__item" + (item.done ? " shopping__item--done" : "")}>
            <button
              type="button"
              className={"shopping__check" + (item.done ? " shopping__check--done" : "")}
              onClick={() => onToggle(item)}
              aria-label="Toggle"
            />
            <span className="shopping__item-name">{item.name}</span>
            <button
              type="button"
              className="shopping__delete"
              onClick={() => onDelete(item.id)}
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
