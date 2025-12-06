"use client";

import { useState } from "react";
import { Zap, LayoutDashboard, Settings, HelpCircle, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1e1f20] border border-[#2d2e2f] rounded-lg hover:bg-[#242526] transition-colors"
      >
        <Menu className="w-5 h-5 text-[#e8e8e8]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Collapsed toggle button - shows when sidebar is collapsed on desktop */}
      {isCollapsed && (
        <button
          onClick={onToggle}
          className="hidden lg:flex fixed top-4 left-4 z-50 p-2 bg-[#1e1f20] border border-[#2d2e2f] rounded-lg hover:bg-[#242526] transition-colors items-center justify-center"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5 text-[#e8e8e8]" />
        </button>
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-16 h-screen bg-[#1a1b1b] border-r border-[#2d2e2f] flex flex-col
        transform transition-all duration-300 ease-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:-translate-x-full lg:w-0 lg:border-r-0' : ''}
      `}>
        {/* Logo */}
        <div className="p-3 flex justify-center border-b border-[#2d2e2f]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#20b2aa] to-[#1a9089] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          <NavItem icon={LayoutDashboard} label="Trade" active />
          <NavItem icon={Settings} label="Settings" disabled />
          <NavItem icon={HelpCircle} label="Help" disabled />
        </nav>

        {/* Collapse button - desktop only */}
        <button
          onClick={onToggle}
          className="hidden lg:flex p-3 border-t border-[#2d2e2f] justify-center hover:bg-[#242526] transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-5 h-5 text-[#6b6c6d] hover:text-[#e8e8e8] transition-colors" />
        </button>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-3 border-t border-[#2d2e2f] flex justify-center"
        >
          <X className="w-5 h-5 text-[#6b6c6d]" />
        </button>

        {/* Footer */}
        <div className="p-2 border-t border-[#2d2e2f] hidden lg:block">
          <div className="text-[8px] text-[#6b6c6d] text-center leading-tight">
            Demo
          </div>
        </div>
      </div>
    </>
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
      title={label}
      className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-colors btn-press ${
        active 
          ? "bg-[#242526] text-[#e8e8e8]" 
          : disabled
            ? "text-[#4a4b4c] cursor-not-allowed"
            : "text-[#6b6c6d] hover:bg-[#242526] hover:text-[#e8e8e8]"
      }`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
