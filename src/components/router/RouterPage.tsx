"use client";

import { useState, useCallback } from "react";
import { Zap } from "lucide-react";
import { RouterInput } from "./RouterInput";
import { PlannedTradesPanel } from "./PlannedTradesPanel";
import { NewTradeModal } from "./NewTradeModal";
import { TwapModal } from "./TwapModal";
import { LockRiskModal } from "./LockRiskModal";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import {
  TradePlan,
  TwapPlan,
  ModalType,
  parseRouterIntent,
  BTC_SHORT_TEMPLATE,
  ZEC_LONG_TEMPLATE,
  SOL_LONG_TEMPLATE,
  ZEC_TWAP_TEMPLATE,
} from "@/lib/router-types";

export function RouterPage() {
  const [trades, setTrades] = useState<TradePlan[]>([]);
  const [twaps, setTwaps] = useState<TwapPlan[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [currentTradePlan, setCurrentTradePlan] = useState<Omit<TradePlan, "id" | "createdAt" | "status"> | null>(null);
  const [currentTwapPlan, setCurrentTwapPlan] = useState<Omit<TwapPlan, "id" | "createdAt" | "status"> | null>(null);
  const [lockTarget, setLockTarget] = useState<TradePlan | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: "success" | "error", title: string, message?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleInputSubmit = useCallback((input: string) => {
    const intent = parseRouterIntent(input);

    if (intent.type === "twap") {
      // TWAP intent - show TWAP modal
      const template = { ...ZEC_TWAP_TEMPLATE };
      if (intent.market) {
        template.market = intent.market;
      }
      if (intent.risk) {
        template.maxRisk = intent.risk;
      }
      if (intent.notional) {
        template.totalNotional = intent.notional;
      }
      setCurrentTwapPlan(template);
      setActiveModal("twap");
    } else if (intent.type === "trade") {
      // Trade intent - show trade modal
      let template;
      if (intent.market === "BTC-PERP" && intent.direction === "short") {
        template = { ...BTC_SHORT_TEMPLATE };
      } else if (intent.market === "ZEC-PERP") {
        template = { ...ZEC_LONG_TEMPLATE };
      } else if (intent.market === "SOL-PERP") {
        template = { ...SOL_LONG_TEMPLATE };
      } else {
        // Default to BTC short or long based on direction
        template = intent.direction === "short" 
          ? { ...BTC_SHORT_TEMPLATE }
          : { ...SOL_LONG_TEMPLATE };
      }

      // Override with parsed values
      if (intent.direction) {
        template.direction = intent.direction;
      }
      if (intent.risk) {
        template.maxRisk = intent.risk;
      }
      if (intent.stop) {
        template.stopPrice = intent.stop;
      }

      setCurrentTradePlan(template);
      setActiveModal("trade");
    } else {
      // Unknown intent - show a generic response
      addToast("error", "Couldn't parse that", "Try: 'short BTC max 3k risk, stop 92k'");
    }
  }, [addToast]);

  const handleArmTrade = useCallback((plan: TradePlan) => {
    setTrades((prev) => [...prev, plan]);
    addToast(
      "success",
      `${plan.market} ${plan.direction.toUpperCase()} confirmed`,
      `${plan.size.toFixed(plan.size > 10 ? 1 : 2)} ${plan.sizeUnit} • Max risk: $${plan.maxRisk.toLocaleString()} (demo)`
    );
  }, [addToast]);

  const handleStartTwap = useCallback((plan: TwapPlan) => {
    setTwaps((prev) => [...prev, plan]);
    addToast(
      "success",
      `Execution started: ${plan.market}`,
      `$${plan.totalNotional.toLocaleString()} over ${plan.duration} minutes (demo)`
    );
  }, [addToast]);

  const handleLockRisk = useCallback((planId: string) => {
    const plan = trades.find((t) => t.id === planId);
    if (plan) {
      setLockTarget(plan);
      setActiveModal("lock");
    }
  }, [trades]);

  const handleConfirmLock = useCallback((planId: string) => {
    setTrades((prev) =>
      prev.map((t) => (t.id === planId ? { ...t, status: "protected" as const } : t))
    );
    addToast("success", "Risk limit enabled", "This position is now protected (demo)");
  }, [addToast]);

  const handleRemoveTrade = useCallback((planId: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== planId));
  }, []);

  const handleRemoveTwap = useCallback((planId: string) => {
    setTwaps((prev) => prev.filter((t) => t.id !== planId));
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setCurrentTradePlan(null);
    setCurrentTwapPlan(null);
    setLockTarget(null);
  }, []);

  return (
    <div className="h-screen flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="px-8 py-6 border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#20b2aa] to-[#20b2aa]/60 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#e8e8e8]">Router</h1>
              <p className="text-sm text-[#6b6c6d]">Structure trades with built-in risk limits</p>
            </div>
          </div>
        </header>

        {/* Main input area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-2xl">
            {/* Hero text */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-[#e8e8e8] mb-3">
                What do you want to trade?
              </h2>
              <p className="text-[#9a9b9c] text-lg">
                Describe your trade in plain English. We&apos;ll calculate the right
                <br />
                position size, entry, and stop based on your risk.
              </p>
            </div>

            {/* Input */}
            <RouterInput onSubmit={handleInputSubmit} />

            {/* How it works */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Describe your trade",
                  desc: "Tell us what you want to trade and your max risk",
                },
                {
                  step: "2",
                  title: "Review the plan",
                  desc: "See the calculated size, entry, and stop",
                },
                {
                  step: "3",
                  title: "Confirm",
                  desc: "One click to place your risk-limited trade",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-8 h-8 rounded-full bg-[#242526] border border-[#3d3e3f] flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-semibold text-[#20b2aa]">{item.step}</span>
                  </div>
                  <h3 className="text-sm font-medium text-[#e8e8e8] mb-1">{item.title}</h3>
                  <p className="text-xs text-[#6b6c6d]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demo notice */}
        <div className="px-8 py-4 border-t border-[#2d2e2f]">
          <p className="text-xs text-[#6b6c6d] text-center">
            Demo only • No real trading • All data is simulated
          </p>
        </div>
      </div>

      {/* Right panel - Planned trades */}
      <div className="w-80 flex-shrink-0">
        <PlannedTradesPanel
          trades={trades}
          twaps={twaps}
          onLockRisk={handleLockRisk}
          onRemoveTrade={handleRemoveTrade}
          onRemoveTwap={handleRemoveTwap}
        />
      </div>

      {/* Modals */}
      {currentTradePlan && (
        <NewTradeModal
          isOpen={activeModal === "trade"}
          onClose={closeModal}
          onArm={handleArmTrade}
          initialPlan={currentTradePlan}
        />
      )}

      {currentTwapPlan && (
        <TwapModal
          isOpen={activeModal === "twap"}
          onClose={closeModal}
          onStart={handleStartTwap}
          initialPlan={currentTwapPlan}
        />
      )}

      <LockRiskModal
        isOpen={activeModal === "lock"}
        onClose={closeModal}
        onLock={handleConfirmLock}
        plan={lockTarget}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

