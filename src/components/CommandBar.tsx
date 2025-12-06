"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ArrowRight, X, ArrowRightLeft, Zap, Clock } from "lucide-react";
import { parseCommand, ASSETS, formatPrice } from "@/lib/mock-data";
import { parseSportsBelief, EventMarket, formatProbability, calculatePayout } from "@/lib/events-data";
import { ParsedCommand } from "@/lib/types";

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (command: ParsedCommand) => void;
  onEventBet?: (markets: EventMarket[], side: "yes" | "no", amount: number) => void;
}

export function CommandBar({ isOpen, onClose, onExecute, onEventBet }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedCommand | null>(null);
  const [eventParsed, setEventParsed] = useState<ReturnType<typeof parseSportsBelief> | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setInput("");
      setParsed(null);
      setEventParsed(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (input.trim()) {
      // Try parsing as crypto command first
      const cryptoParsed = parseCommand(input);
      setParsed(cryptoParsed);
      
      // Also try parsing as sports/event belief
      const sportsParsed = parseSportsBelief(input);
      if (sportsParsed.markets.length > 0) {
        setEventParsed(sportsParsed);
      } else {
        setEventParsed(null);
      }
    } else {
      setParsed(null);
      setEventParsed(null);
    }
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      // If we have event markets, execute that
      if (eventParsed && eventParsed.markets.length > 0 && onEventBet) {
        onEventBet(eventParsed.markets, "yes", betAmount);
        onClose();
      } else if (parsed && parsed.type !== "unknown") {
        onExecute(parsed);
        onClose();
      }
    }
  }, [onClose, onExecute, onEventBet, parsed, eventParsed, betAmount]);

  if (!isOpen) return null;

  const hasEventMatch = eventParsed && eventParsed.markets.length > 0;
  const hasCryptoMatch = parsed && parsed.type !== "unknown";

  const getPreviewContent = () => {
    // Show event preview if we matched sports/event markets
    if (hasEventMatch) {
      const markets = eventParsed.markets;
      const isMultiple = markets.length > 1;
      
      // Calculate combined probability and payout
      const combinedProb = markets.reduce((acc, m) => acc * m.yesPrice, 1);
      const potentialPayout = calculatePayout(betAmount, combinedProb);

      return (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-lg">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 font-medium">
                {isMultiple ? "Multi-Bet" : "Prediction Market"}
              </span>
            </div>
            {isMultiple && (
              <span className="text-xs text-[#6b6c6d]">
                {markets.length} markets combined
              </span>
            )}
          </div>

          {/* Markets */}
          <div className="space-y-2">
            {markets.map((market, idx) => (
              <div 
                key={market.id}
                className="p-3 bg-[#1e1f20] rounded-lg border border-[#2d2e2f]"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{market.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-[#e8e8e8] text-sm">
                      {market.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#20b2aa]/20 text-[#20b2aa]">
                        YES @ ${market.yesPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#6b6c6d]">
                        {formatProbability(market.yesPrice)} implied
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bet summary */}
          <div className="flex items-center justify-between p-3 bg-[#20b2aa]/10 rounded-lg border border-[#20b2aa]/20">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-[#6b6c6d]">Bet Amount</div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[#e8e8e8]">${betAmount}</span>
                  <div className="flex gap-1 ml-2">
                    {[50, 100, 250, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={(e) => { e.stopPropagation(); setBetAmount(amt); }}
                        className={`px-1.5 py-0.5 text-xs rounded ${
                          betAmount === amt 
                            ? "bg-[#20b2aa] text-white" 
                            : "bg-[#2d2e2f] text-[#9a9b9c] hover:bg-[#3d3e3f]"
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#6b6c6d]">Potential Payout</div>
              <div className="font-mono font-semibold text-[#20b2aa]">
                ${potentialPayout.toFixed(0)}
              </div>
              {isMultiple && (
                <div className="text-[10px] text-[#6b6c6d]">
                  Combined odds: {formatProbability(combinedProb)}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Otherwise show crypto preview
    if (!parsed) return null;

    if (parsed.type === "unknown") {
      return (
        <div className="text-red-400 text-sm">
          {parsed.error || "Type a command..."}
        </div>
      );
    }

    if (parsed.type === "pair" && parsed.longAsset && parsed.shortAsset) {
      const longAsset = ASSETS[parsed.longAsset];
      const shortAsset = ASSETS[parsed.shortAsset];
      const size = parsed.size || 10000;

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#d4a853]/20 rounded-lg">
              <ArrowRightLeft className="w-4 h-4 text-[#d4a853]" />
              <span className="text-[#d4a853] font-medium">PAIR TRADE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 p-3 bg-[#20b2aa]/10 rounded-lg border border-[#20b2aa]/20">
              <div className="text-xs text-[#20b2aa] mb-1">LONG</div>
              <div className="font-semibold text-[#e8e8e8]">{parsed.longAsset}</div>
              <div className="text-xs text-[#6b6c6d]">${formatPrice(longAsset.price)}</div>
            </div>
            <div className="flex-1 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="text-xs text-red-400 mb-1">SHORT</div>
              <div className="font-semibold text-[#e8e8e8]">{parsed.shortAsset}</div>
              <div className="text-xs text-[#6b6c6d]">${formatPrice(shortAsset.price)}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#9a9b9c]">
            <span>${size.toLocaleString()} per leg</span>
            <span>·</span>
            <span>{parsed.leverage || 2}x leverage</span>
          </div>
        </div>
      );
    }

    if (parsed.type === "trade" && parsed.asset && parsed.direction) {
      const asset = ASSETS[parsed.asset];
      const size = parsed.size || 1000;
      const leverage = parsed.leverage || 1;

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium px-2.5 py-1 rounded-lg ${
              parsed.direction === "long" 
                ? "bg-[#20b2aa]/20 text-[#20b2aa]" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {parsed.direction.toUpperCase()}
            </span>
            <span className="text-lg font-semibold text-[#e8e8e8]">{parsed.asset}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#9a9b9c]">
            <span>${size.toLocaleString()}</span>
            <span>·</span>
            <span>{leverage}x</span>
            <span>·</span>
            <span>~${formatPrice(asset.price)}</span>
          </div>
        </div>
      );
    }

    if (parsed.type === "close" && parsed.asset) {
      return (
        <div className="text-[#e8e8e8]">
          Close <span className="font-semibold text-[#20b2aa]">{parsed.asset}</span> position
        </div>
      );
    }

    if (parsed.type === "flip" && parsed.asset) {
      return (
        <div className="text-[#e8e8e8]">
          Flip <span className="font-semibold text-[#d4a853]">{parsed.asset}</span> position
        </div>
      );
    }

    if (parsed.type === "closeAll") {
      return <div className="text-red-400 font-medium">Close ALL positions</div>;
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Command bar */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-[#242526] border border-[#2d2e2f] rounded-2xl shadow-2xl overflow-hidden">
          {/* Input area */}
          <div className="flex items-center gap-3 px-5 py-4">
            <Search className="w-5 h-5 text-[#6b6c6d]" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="sol long 10k 2x  ·  lakers win tonight  ·  btc 100k by december"
              className="flex-1 bg-transparent text-[#e8e8e8] text-lg placeholder-[#6b6c6d] focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <button onClick={onClose} className="p-1.5 hover:bg-[#2d2e2f] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#6b6c6d]" />
            </button>
          </div>

          <div className="border-t border-[#2d2e2f]" />

          {/* Preview area */}
          <div className="px-5 py-4 min-h-[100px]">
            {getPreviewContent() || (
              <div className="space-y-3 text-sm">
                <div className="text-[#9a9b9c] font-medium">What do you want to trade?</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#1e1f20] rounded-lg">
                    <div className="text-xs text-[#6b6c6d] mb-1">Crypto</div>
                    <code className="text-xs text-[#9a9b9c]">sol long 10k 2x</code>
                  </div>
                  <div className="p-2 bg-[#1e1f20] rounded-lg">
                    <div className="text-xs text-[#6b6c6d] mb-1">Pairs</div>
                    <code className="text-xs text-[#9a9b9c]">sol vs eth 10k</code>
                  </div>
                  <div className="p-2 bg-[#1e1f20] rounded-lg">
                    <div className="text-xs text-[#6b6c6d] mb-1">Sports</div>
                    <code className="text-xs text-[#9a9b9c]">lakers win tonight</code>
                  </div>
                  <div className="p-2 bg-[#1e1f20] rounded-lg">
                    <div className="text-xs text-[#6b6c6d] mb-1">Events</div>
                    <code className="text-xs text-[#9a9b9c]">btc 100k by december</code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#1e1f20] text-xs text-[#6b6c6d]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-[#2d2e2f] rounded text-[#9a9b9c]">↵</kbd>
                <span>Execute</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-[#2d2e2f] rounded text-[#9a9b9c]">esc</kbd>
                <span>Cancel</span>
              </span>
            </div>
            {(hasEventMatch || hasCryptoMatch) && (
              <div className="flex items-center gap-1.5 text-[#20b2aa]">
                <span>Ready</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
