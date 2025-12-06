"use client";

import { useState } from "react";
import { 
  TrendingDown, 
  TrendingUp, 
  Copy, 
  Check, 
  AlertTriangle,
  X,
  ArrowLeft,
  ExternalLink,
  Shield
} from "lucide-react";
import { TradeSetup } from "./ChartAnalystCard";

interface TradeSetupCardProps {
  setup: TradeSetup;
  currentPrice: number;
  onBack: () => void;
  onClose: () => void;
}

function CopyableValue({ 
  label, 
  value, 
  displayValue,
  highlight = false,
}: { 
  label: string; 
  value: string | number;
  displayValue?: string;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
      highlight ? "bg-[#242526]" : "hover:bg-[#1e1f20]"
    }`}>
      <div>
        <div className="text-xs text-[#6b6c6d] mb-0.5">{label}</div>
        <div className={`font-mono ${highlight ? "text-cyan-400" : "text-[#e8e8e8]"}`}>
          {displayValue || value}
        </div>
      </div>
      <button
        onClick={handleCopy}
        className={`p-2 rounded-lg transition-all ${
          copied 
            ? "bg-emerald-500/20 text-emerald-400" 
            : "bg-[#2d2e2f] hover:bg-[#3d3e3f] text-[#9a9b9c]"
        }`}
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function TradeSetupCard({
  setup,
  currentPrice,
  onBack,
  onClose,
}: TradeSetupCardProps) {
  const [size, setSize] = useState(2000);
  const [showAllCopied, setShowAllCopied] = useState(false);
  
  const isShort = setup.direction === "short";
  const Icon = isShort ? TrendingDown : TrendingUp;
  const color = isShort ? "rose" : "emerald";
  
  // Calculate risk based on size and stop
  const entryEstimate = (setup.zone.high + setup.zone.low) / 2;
  const stopDistance = Math.abs(entryEstimate - setup.stopLoss);
  const stopPercent = ((stopDistance / entryEstimate) * 100).toFixed(1);
  const potentialLoss = (size * (stopDistance / entryEstimate)).toFixed(0);
  
  // Calculate potential gains
  const target1Distance = Math.abs(setup.target1 - entryEstimate);
  const target1Percent = ((target1Distance / entryEstimate) * 100).toFixed(1);
  const potentialGain1 = (size * (target1Distance / entryEstimate)).toFixed(0);
  
  const target2Distance = Math.abs(setup.target2 - entryEstimate);
  const target2Percent = ((target2Distance / entryEstimate) * 100).toFixed(1);
  const potentialGain2 = (size * (target2Distance / entryEstimate)).toFixed(0);
  
  const handleCopyAll = () => {
    const values = [
      `Direction: ${setup.direction.toUpperCase()}`,
      `Entry Zone: $${setup.zone.low.toLocaleString()} - $${setup.zone.high.toLocaleString()}`,
      `Stop Loss: $${setup.stopLoss.toLocaleString()}`,
      `Take Profit 1: $${setup.target1.toLocaleString()}`,
      `Take Profit 2: $${setup.target2.toLocaleString()}`,
      `Trigger: ${setup.trigger}`,
    ].join("\n");
    
    navigator.clipboard.writeText(values);
    setShowAllCopied(true);
    setTimeout(() => setShowAllCopied(false), 2000);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 border-b border-[#2d2e2f] bg-gradient-to-r ${
          isShort ? "from-rose-500/5 to-transparent" : "from-emerald-500/5 to-transparent"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-[#242526] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-[#6b6c6d]" />
              </button>
              <div className={`p-2 rounded-xl bg-${color}-500/10`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
              </div>
              <div>
                <div className={`font-medium text-${color}-400`}>
                  {isShort ? "Short" : "Long"} Setup
                </div>
                <div className="text-xs text-[#6b6c6d]">Pre-filled for your terminal</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#242526] rounded-lg transition-colors">
              <X className="w-4 h-4 text-[#6b6c6d]" />
            </button>
          </div>
        </div>

        {/* Trigger Reminder */}
        <div className={`px-5 py-3 border-b border-[#2d2e2f] bg-${color}-500/5`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-4 h-4 text-${color}-400 mt-0.5 flex-shrink-0`} />
            <div>
              <div className="text-xs text-[#6b6c6d] mb-0.5">Only execute when:</div>
              <div className={`text-sm text-${color}-400`}>{setup.trigger}</div>
            </div>
          </div>
        </div>

        {/* Size Selection */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] mb-2">Position Size</div>
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map((amount) => (
              <button
                key={amount}
                onClick={() => setSize(amount)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  size === amount
                    ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                    : "bg-[#242526] text-[#9a9b9c] hover:bg-[#2d2e2f] border border-transparent"
                }`}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Copyable Values */}
        <div className="px-5 py-3 space-y-1 border-b border-[#2d2e2f]">
          <CopyableValue 
            label="Entry Zone" 
            value={`${setup.zone.low}-${setup.zone.high}`}
            displayValue={`$${setup.zone.low.toLocaleString()} – $${setup.zone.high.toLocaleString()}`}
            highlight
          />
          <CopyableValue 
            label={`Stop Loss (${stopPercent}% away)`}
            value={setup.stopLoss}
            displayValue={`$${setup.stopLoss.toLocaleString()}`}
          />
          <CopyableValue 
            label={`Take Profit 1 (${target1Percent}% move)`}
            value={setup.target1}
            displayValue={`$${setup.target1.toLocaleString()}`}
          />
          <CopyableValue 
            label={`Take Profit 2 (${target2Percent}% move)`}
            value={setup.target2}
            displayValue={`$${setup.target2.toLocaleString()}`}
          />
        </div>

        {/* Risk/Reward Summary */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-[#6b6c6d] mb-1">Max Loss</div>
              <div className="text-rose-400 font-mono">-${potentialLoss}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#6b6c6d] mb-1">Target 1</div>
              <div className="text-emerald-400 font-mono">+${potentialGain1}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#6b6c6d] mb-1">Target 2</div>
              <div className="text-emerald-400 font-mono">+${potentialGain2}</div>
            </div>
          </div>
        </div>

        {/* Copy All + Open Terminal */}
        <div className="px-5 py-4 space-y-3">
          <button
            onClick={handleCopyAll}
            className={`w-full py-3 rounded-xl font-medium transition-all btn-press flex items-center justify-center gap-2 ${
              showAllCopied
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-[#242526] hover:bg-[#2d2e2f] text-[#e8e8e8] border border-[#2d2e2f]"
            }`}
          >
            {showAllCopied ? (
              <>
                <Check className="w-4 h-4" />
                All Values Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy All Values
              </>
            )}
          </button>
          
          <a
            href="https://app.hyperliquid.xyz/trade/BTC"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3 rounded-xl font-medium transition-all btn-press flex items-center justify-center gap-2
              bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-400 border border-${color}-500/20`}
          >
            Open Hyperliquid
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#161717] border-t border-[#2d2e2f]">
          <div className="flex items-center gap-2 text-xs text-[#6b6c6d]">
            <Shield className="w-3 h-3" />
            <span>This trade is staged, not live • Execute manually when trigger confirms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

