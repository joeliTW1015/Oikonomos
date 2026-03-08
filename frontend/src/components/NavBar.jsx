import React from "react";
import { CalendarDays, MessageCircle, FileText, Settings } from "lucide-react";

const TABS = [
  { id: "calendar", icon: CalendarDays, label: "Calendar" },
  { id: "chat",     icon: MessageCircle, label: "AI Chat" },
  { id: "summary",  icon: FileText,      label: "Summary" },
  { id: "settings", icon: Settings,      label: "Settings" },
];

export default function NavBar({ activePage, onNavigate }) {
  return (
    <nav className="nav">
      {TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={"nav__tab" + (activePage === id ? " nav__tab--active" : "")}
          onClick={() => onNavigate(id)}
        >
          <Icon size={20} />
          <span className="nav__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
