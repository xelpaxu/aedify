import type React from "react";

type SidebarProps = {
  sections: { id: string; label: string; icon?: React.ReactNode }[];
  activeId: string;
  onSelect: (id: string) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ sections, activeId, onSelect }) => {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold">
          M
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-wide text-black">Mosquito Watch</span>
          <span className="text-xs text-slate-400 text-black">Barangay Admin</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={[
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-black hover:bg-slate-800/60 hover:text-slate-50"
              ].join(" ")}
            >
              {section.icon && <span className="text-base">{section.icon}</span>}
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>

    </aside>
  );
};

