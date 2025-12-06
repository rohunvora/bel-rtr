// Router feature types

export interface TradePlan {
  id: string;
  market: string;
  direction: "long" | "short";
  maxRisk: number;
  stopPrice: number;
  size: number;
  sizeUnit: string;
  entryPrice: number;
  leverage: number;
  status: "planned" | "armed" | "locked";
  createdAt: string;
}

export interface TwapPlan {
  id: string;
  market: string;
  direction: "long" | "short";
  totalNotional: number;
  maxRisk: number;
  stopPrice: number;
  duration: number; // minutes
  slices: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  status: "planned" | "active";
  createdAt: string;
}

export type ModalType = "trade" | "twap" | "lock" | null;

export interface ParsedIntent {
  type: "trade" | "twap" | "unknown";
  market?: string;
  direction?: "long" | "short";
  risk?: number;
  stop?: number;
  notional?: number;
}

// Templates for demo
export const BTC_SHORT_TEMPLATE: Omit<TradePlan, "id" | "createdAt" | "status"> = {
  market: "BTC-PERP",
  direction: "short",
  maxRisk: 3000,
  stopPrice: 92000,
  size: 4.2,
  sizeUnit: "BTC",
  entryPrice: 90800,
  leverage: 2.3,
};

export const ZEC_LONG_TEMPLATE: Omit<TradePlan, "id" | "createdAt" | "status"> = {
  market: "ZEC-PERP",
  direction: "long",
  maxRisk: 2000,
  stopPrice: 349,
  size: 353,
  sizeUnit: "ZEC",
  entryPrice: 357,
  leverage: 1.8,
};

export const SOL_LONG_TEMPLATE: Omit<TradePlan, "id" | "createdAt" | "status"> = {
  market: "SOL-PERP",
  direction: "long",
  maxRisk: 3000,
  stopPrice: 180,
  size: 142,
  sizeUnit: "SOL",
  entryPrice: 195,
  leverage: 2.1,
};

export const ZEC_TWAP_TEMPLATE: Omit<TwapPlan, "id" | "createdAt" | "status"> = {
  market: "ZEC-PERP",
  direction: "long",
  totalNotional: 50000,
  maxRisk: 3000,
  stopPrice: 349,
  duration: 15,
  slices: 5,
  priceRangeLow: 352,
  priceRangeHigh: 358,
};

// Parse user input and detect intent
export function parseRouterIntent(input: string): ParsedIntent {
  const normalized = input.toLowerCase();
  
  // Extract risk amount
  const riskMatch = normalized.match(/(?:risk|max|lose)\s*\$?(\d+(?:,?\d+)?(?:k)?)/);
  let risk: number | undefined;
  if (riskMatch) {
    let riskStr = riskMatch[1].replace(",", "");
    if (riskStr.endsWith("k")) {
      risk = parseFloat(riskStr) * 1000;
    } else {
      risk = parseFloat(riskStr);
    }
  }

  // Extract stop/invalidation price
  const stopMatch = normalized.match(/(?:stop|invalidat\w*|above|below)\s*\$?(\d+(?:,?\d+)?(?:\.\d+)?)/);
  let stop: number | undefined;
  if (stopMatch) {
    stop = parseFloat(stopMatch[1].replace(",", ""));
  }

  // Extract notional for TWAP
  const notionalMatch = normalized.match(/(\d+(?:,?\d+)?(?:k)?)\s*(?:notional|worth|of)/);
  let notional: number | undefined;
  if (notionalMatch) {
    let notionalStr = notionalMatch[1].replace(",", "");
    if (notionalStr.endsWith("k")) {
      notional = parseFloat(notionalStr) * 1000;
    } else {
      notional = parseFloat(notionalStr);
    }
  }

  // Detect TWAP intent
  if (normalized.includes("twap") || normalized.includes("accumulate") || 
      normalized.includes("books are thin") || normalized.includes("thin book") ||
      (notional && notional >= 10000)) {
    return {
      type: "twap",
      market: normalized.includes("zec") ? "ZEC-PERP" : 
              normalized.includes("btc") ? "BTC-PERP" : 
              normalized.includes("sol") ? "SOL-PERP" : "ZEC-PERP",
      direction: normalized.includes("short") ? "short" : "long",
      risk,
      notional: notional || 50000,
    };
  }

  // Detect trade intent
  const isBtc = normalized.includes("btc") || normalized.includes("bitcoin");
  const isZec = normalized.includes("zec") || normalized.includes("zcash");
  const isSol = normalized.includes("sol") || normalized.includes("solana");
  const isShort = normalized.includes("short");
  const isLong = normalized.includes("long") || normalized.includes("buy");

  if (isBtc || isZec || isSol || isShort || isLong) {
    let market = "BTC-PERP";
    if (isZec) market = "ZEC-PERP";
    if (isSol) market = "SOL-PERP";

    return {
      type: "trade",
      market,
      direction: isShort ? "short" : "long",
      risk,
      stop,
    };
  }

  return { type: "unknown" };
}

// Calculate position size from risk and stop distance
export function calculateSize(
  risk: number,
  entryPrice: number,
  stopPrice: number,
  direction: "long" | "short"
): number {
  const stopDistance = direction === "long" 
    ? entryPrice - stopPrice 
    : stopPrice - entryPrice;
  
  if (stopDistance <= 0) return 0;
  
  return risk / stopDistance;
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format number with commas
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

