"use client";

import { LayoutDashboard, History, Settings, BarChart3 } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const tabs = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "history", icon: History, label: "History" },
    { id: "analytics", icon: BarChart3, label: "Analytics" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 z-40">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center font-bold text-white text-sm">
          BR
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all group relative ${
                isActive 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
              title={tab.label}
            >
              <Icon className="w-5 h-5" />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                {tab.label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
          U
        </div>
      </div>
    </aside>
  );
}
