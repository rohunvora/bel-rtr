export interface ParsedIntent {
  assets: string[];
  direction: "long" | "short" | "unknown";
  timeframeHours: number;
  confidence: number;
  summary: string;
}

export interface TradeSuggestion {
  id: string;
  label: string;
  ticker: string;
  name: string;
  venue: string;
  direction: "long" | "short";
  leverage: number;
  sizeUsd: number;
  timeframeHours: number;
  stopLossPct: number;
  takeProfitPct: number;
  riskLevel: "safe" | "moderate" | "aggressive";
  explanation: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePct24h: number;
  stats: {
    prevClose: number;
    open: number;
    dayRange: string;
    weekRange52: string;
    volume: string;
    marketCap: string;
    peRatio?: number;
    eps?: number;
  };
  payoffPreview: {
    maxGainUsd: number;
    maxLossUsd: number;
    maxGainPct: number;
    maxLossPct: number;
  };
}

export interface AlternativeTrade extends TradeSuggestion {
  variant: "safer" | "riskier" | "different_venue";
}

export interface LivePosition {
  positionId: string;
  ticker: string;
  name: string;
  direction: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  sizeUsd: number;
  leverage: number;
  pnlUsd: number;
  pnlPct: number;
  openedAt: string;
  timeRemainingSeconds: number;
  status: "open" | "closing" | "closed";
}

export type ViewState = "home" | "results" | "position";
