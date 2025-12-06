"use client";

import { LayoutDashboard, History, Settings, Plus, Bell, Zap } from "lucide-react";

export type TabType = "dashboard" | "router";

interface SidebarProps {
  onNewTrade: () => void;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export function Sidebar({ onNewTrade, activeTab = "dashboard", onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-[68px] bg-[#191a1a] border-r border-[#2d2e2f] flex flex-col items-center py-4 z-40">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-10 h-10 rounded-lg bg-[#242526] flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-[#20b2aa]"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* New Trade Button */}
      <button
        onClick={onNewTrade}
        className="w-10 h-10 rounded-lg bg-[#242526] hover:bg-[#2d2e2f] flex items-center justify-center mb-6 transition-colors"
        title="New Trade (⌘K)"
      >
        <Plus className="w-5 h-5 text-[#9a9b9c]" />
      </button>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        <NavItem 
          icon={<LayoutDashboard className="w-5 h-5" />} 
          label="Dashboard" 
          active={activeTab === "dashboard"}
          onClick={() => onTabChange?.("dashboard")}
        />
        <NavItem 
          icon={<Zap className="w-5 h-5" />} 
          label="Router" 
          active={activeTab === "router"}
          onClick={() => onTabChange?.("router")}
        />
        <NavItem icon={<History className="w-5 h-5" />} label="History" />
        <NavItem icon={<Settings className="w-5 h-5" />} label="Settings" />
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-4 mt-auto">
        <button className="w-10 h-10 rounded-lg hover:bg-[#242526] flex items-center justify-center transition-colors">
          <Bell className="w-5 h-5 text-[#6b6c6d]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#20b2aa] to-[#d4a853] flex items-center justify-center text-xs font-medium text-white">
          U
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-colors group ${
        active ? "bg-[#242526] text-white" : "hover:bg-[#242526] text-[#6b6c6d] hover:text-[#9a9b9c]"
      }`}
      title={label}
    >
      {icon}
      {/* Tooltip */}
      <div className="absolute left-full ml-2 px-2 py-1 bg-[#2d2e2f] text-[#e8e8e8] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </button>
  );
}
