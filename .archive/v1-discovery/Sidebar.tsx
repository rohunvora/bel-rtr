"use client";

import { Home, Compass, LayoutGrid, TrendingUp, Bell, Plus } from "lucide-react";

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-[68px] bg-[#191a1a] border-r border-[#2d2e2f] flex flex-col items-center py-4 z-50">
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

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="w-10 h-10 rounded-lg bg-[#242526] hover:bg-[#2d2e2f] flex items-center justify-center mb-6 transition-colors"
      >
        <Plus className="w-5 h-5 text-[#9a9b9c]" />
      </button>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        <NavItem icon={<Home className="w-5 h-5" />} label="Home" active />
        <NavItem icon={<Compass className="w-5 h-5" />} label="Discover" />
        <NavItem icon={<LayoutGrid className="w-5 h-5" />} label="Spaces" />
        <NavItem icon={<TrendingUp className="w-5 h-5" />} label="Markets" />
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-4 mt-auto">
        <button className="w-10 h-10 rounded-lg hover:bg-[#242526] flex items-center justify-center transition-colors">
          <Bell className="w-5 h-5 text-[#9a9b9c]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#20b2aa] to-[#d4a853] flex items-center justify-center text-xs font-medium">
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
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-colors group relative ${
        active ? "bg-[#242526] text-white" : "hover:bg-[#242526] text-[#9a9b9c]"
      }`}
    >
      {icon}
      <span className="text-[10px] mt-0.5">{label}</span>
    </button>
  );
}
