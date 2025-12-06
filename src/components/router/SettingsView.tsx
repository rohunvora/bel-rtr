"use client";

import { useState } from "react";

export function SettingsView({ onAction }: { onAction?: (title: string, msg: string) => void }) {
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold text-[#e8e8e8] mb-6">Settings</h2>
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-[#e8e8e8] mb-2">Account</h3>
          <p className="text-[#6b6c6d] text-sm">Manage your account settings and preferences.</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#242526] rounded-lg border border-[#2d2e2f]">
            <div>
              <div className="text-[#e8e8e8] font-medium">Notifications</div>
              <div className="text-[#6b6c6d] text-xs">Receive updates about your trades</div>
            </div>
            <div 
              className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${notifications ? "bg-[#20b2aa]" : "bg-[#3d3e3f]"}`}
              onClick={() => {
                const newState = !notifications;
                setNotifications(newState);
                onAction?.("Notifications", newState ? "Enabled" : "Disabled");
              }}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? "right-1" : "left-1"}`} />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#242526] rounded-lg border border-[#2d2e2f]">
            <div>
              <div className="text-[#e8e8e8] font-medium">Risk Limits</div>
              <div className="text-[#6b6c6d] text-xs">Default risk per trade</div>
            </div>
            <div className="text-[#e8e8e8] font-mono">$3,000</div>
          </div>
        </div>
      </div>
    </div>
  );
}
