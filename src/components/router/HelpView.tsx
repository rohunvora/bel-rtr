"use client";

import { HelpCircle, Book, MessageCircle } from "lucide-react";

export function HelpView({ onAction }: { onAction?: (title: string, msg: string) => void }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-semibold text-[#e8e8e8] mb-6">Help & Support</h2>
      
      <div className="grid gap-6">
        <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#20b2aa]/10 rounded-lg">
              <Book className="w-5 h-5 text-[#20b2aa]" />
            </div>
            <h3 className="text-lg font-medium text-[#e8e8e8]">Documentation</h3>
          </div>
          <p className="text-[#6b6c6d] text-sm mb-4">
            Learn how to use the router, understand order types, and manage your portfolio.
          </p>
          <button 
            onClick={() => onAction?.("Documentation", "Opening guide...")}
            className="text-[#20b2aa] text-sm hover:underline"
          >
            Read the guide →
          </button>
        </div>

        <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-[#e8e8e8]">Support</h3>
          </div>
          <p className="text-[#6b6c6d] text-sm mb-4">
            Need help with a specific issue? Our team is available 24/7.
          </p>
          <button 
            onClick={() => onAction?.("Support", "Connecting to agent...")}
            className="text-[#20b2aa] text-sm hover:underline"
          >
            Contact support →
          </button>
        </div>

        <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <HelpCircle className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-lg font-medium text-[#e8e8e8]">FAQ</h3>
          </div>
          <div className="space-y-3">
            <details className="text-sm group">
              <summary className="text-[#e8e8e8] cursor-pointer hover:text-[#20b2aa] transition-colors marker:text-[#6b6c6d]">How are fees calculated?</summary>
              <p className="text-[#6b6c6d] mt-2 pl-4">Fees are calculated based on the notional value of your position. Taker fees are 0.05% and maker fees are 0.02%.</p>
            </details>
            <details className="text-sm group">
              <summary className="text-[#e8e8e8] cursor-pointer hover:text-[#20b2aa] transition-colors marker:text-[#6b6c6d]">What is the max leverage?</summary>
              <p className="text-[#6b6c6d] mt-2 pl-4">Max leverage depends on the asset class. Crypto perps allow up to 20x, while stocks are capped at 5x.</p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
