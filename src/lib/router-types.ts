// Router feature types

export type MarketType = "crypto" | "prediction" | "stock";

export interface TradePlan {
  id: string;
  prompt: string; // The original user input that created this trade
  marketType: MarketType;
  market: string;
  direction: "long" | "short";
  maxRisk: number;
  stopPrice: number;
  size: number;
  sizeUnit: string;
  entryPrice: number;
  leverage: number;
  status: "planned" | "confirmed" | "protected";
  createdAt: string;
  // For bootstrapped markets (prediction/stock)
  externalUrl?: string; // Link to execute on external platform
}

export interface TwapPlan {
  id: string;
  prompt: string; // The original user input
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

export interface PredictionPlan {
  id: string;
  prompt: string;
  marketType: "prediction";
  market: string; // e.g., "Lakers beat Celtics tonight"
  platform: "polymarket" | "kalshi";
  side: "yes" | "no";
  amount: number;
  odds: number; // current price 0-1
  potentialPayout: number;
  externalUrl: string;
  status: "planned" | "confirmed";
  createdAt: string;
}

export interface StockPlan {
  id: string;
  prompt: string;
  marketType: "stock";
  ticker: string;
  companyName: string;
  direction: "long" | "short";
  amount: number;
  currentPrice: number;
  externalUrl: string;
  platform: "robinhood" | "schwab" | "fidelity";
  status: "planned" | "confirmed";
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
  // Interpretation metadata
  interpretation?: string;
  confidence?: number;
  originalInput?: string;
}

// Parse user input and detect intent
export function parseRouterIntent(input: string): ParsedIntent {
  const normalized = input.toLowerCase();
  const originalInput = input;
  
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
  const stopMatch = normalized.match(/(?:stop|invalidat\w*|above|below|holds?)\s*\$?(\d+(?:,?\d+)?(?:\.\d+)?)/);
  let stop: number | undefined;
  if (stopMatch) {
    stop = parseFloat(stopMatch[1].replace(",", ""));
  }

  // Extract notional for TWAP
  const notionalMatch = normalized.match(/\$?(\d+(?:,?\d+)?(?:k)?)\s*(?:notional|worth|total)/);
  let notional: number | undefined;
  if (notionalMatch) {
    let notionalStr = notionalMatch[1].replace(",", "");
    if (notionalStr.endsWith("k")) {
      notional = parseFloat(notionalStr) * 1000;
    } else {
      notional = parseFloat(notionalStr);
    }
  }

  // Detect assets
  const isBtc = normalized.includes("btc") || normalized.includes("bitcoin");
  const isEth = normalized.includes("eth") || normalized.includes("ethereum");
  const isZec = normalized.includes("zec") || normalized.includes("zcash");
  const isSol = normalized.includes("sol") || normalized.includes("solana");

  // Detect direction - expanded to catch vague bearish/bullish language
  const bearishWords = ["short", "dump", "down", "fall", "drop", "weak", "fade", "sell", "bearish", "crash", "tank"];
  const bullishWords = ["long", "buy", "up", "rise", "pump", "strong", "bullish", "moon", "rally", "rip"];
  
  const isBearish = bearishWords.some(word => normalized.includes(word));
  const isBullish = bullishWords.some(word => normalized.includes(word));

  // Detect TWAP intent
  const twapWords = ["twap", "accumulate", "slowly", "gradual", "spread", "over time", "thin book", "books are thin", "over 15", "over 30", "minutes"];
  const isTwap = twapWords.some(word => normalized.includes(word)) || (notional && notional >= 10000);

  if (isTwap) {
    const market = isZec ? "ZEC-PERP" : isBtc ? "BTC-PERP" : isSol ? "SOL-PERP" : isEth ? "ETH-PERP" : "ZEC-PERP";
    return {
      type: "twap",
      market,
      direction: isBearish ? "short" : "long",
      risk,
      notional: notional || 50000,
      interpretation: `Gradual ${isBearish ? "sell" : "accumulation"} of ${market.split("-")[0]}`,
      confidence: notional ? 90 : 75,
      originalInput,
    };
  }

  // Detect trade intent - now catches vague inputs
  if (isBtc || isEth || isZec || isSol || isBearish || isBullish) {
    let market = "BTC-PERP";
    if (isZec) market = "ZEC-PERP";
    else if (isSol) market = "SOL-PERP";
    else if (isEth) market = "ETH-PERP";

    const direction: "long" | "short" = isBearish ? "short" : "long";
    
    // Build interpretation string
    let interpretation = "";
    const asset = market.split("-")[0];
    
    if (isBearish) {
      interpretation = `Bearish on ${asset} → Short position`;
    } else {
      interpretation = `Bullish on ${asset} → Long position`;
    }
    
    // Calculate confidence based on how specific the input was
    let confidence = 70;
    if (risk) confidence += 10;
    if (stop) confidence += 10;
    if (normalized.includes("short") || normalized.includes("long")) confidence += 5;

    return {
      type: "trade",
      market,
      direction,
      risk,
      stop,
      interpretation,
      confidence: Math.min(confidence, 95),
      originalInput,
    };
  }

  return { type: "unknown", originalInput };
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

