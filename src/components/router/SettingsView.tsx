export function SettingsView() {
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
            <div className="w-10 h-6 bg-[#20b2aa] rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
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

