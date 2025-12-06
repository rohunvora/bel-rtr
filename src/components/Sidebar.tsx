"use client";

import { Zap, LayoutDashboard, Settings, HelpCircle } from "lucide-react";

interface SidebarProps {
  children?: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <div className="w-64 h-screen bg-[#1a1b1b] border-r border-[#2d2e2f] flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-[#2d2e2f]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#20b2aa] to-[#1a9089] flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-semibold text-[#e8e8e8] text-lg tracking-tight">Router</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <NavItem icon={LayoutDashboard} label="Trade" active />
        <NavItem icon={Settings} label="Settings" disabled />
        <NavItem icon={HelpCircle} label="Help" disabled />
      </nav>

      {/* Portfolio section */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-[#2d2e2f]">
        {children}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#2d2e2f]">
        <div className="text-xs text-[#6b6c6d] text-center">
          Demo Mode • No Real Trades
        </div>
      </div>
    </div>
  );
}

function NavItem({ 
  icon: Icon, 
  label, 
  active = false,
  disabled = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? "bg-[#242526] text-[#e8e8e8]" 
          : disabled
            ? "text-[#4a4b4c] cursor-not-allowed"
            : "text-[#9a9b9c] hover:bg-[#242526] hover:text-[#e8e8e8]"
      }`}
    >
      <Icon className="w-4.5 h-4.5" />
      {label}
    </button>
  );
}

