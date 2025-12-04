import { TradeSuggestion, AlternativeTrade, ParsedIntent } from "./types";

export interface ThemeMapping {
  theme: string;
  description: string;
  tickers: { ticker: string; name: string; reason: string }[];
}

export const themeExplanations: Record<string, {
  themeName: string;
  themeDescription: string;
  whyThisPick: string;
  relatedTickers: { ticker: string; name: string; exposure: string }[];
}> = {
  peptides: {
    themeName: "GLP-1 / Weight Loss Drugs",
    themeDescription: "The peptide/GLP-1 weight loss drug market is experiencing explosive growth. Ozempic, Wegovy, Mounjaro, and Zepbound are reshaping healthcare and consumer behavior.",
    whyThisPick: "Eli Lilly is the highest-momentum play in GLP-1. Zepbound is taking market share from Novo Nordisk, and their oral GLP-1 pipeline is ahead. This gives you concentrated exposure to the peptide thesis with strong fundamentals.",
    relatedTickers: [
      { ticker: "NVO", name: "Novo Nordisk", exposure: "Market leader (Ozempic, Wegovy)" },
      { ticker: "VKTX", name: "Viking Therapeutics", exposure: "Pure-play, high-beta pipeline" },
      { ticker: "GPCR", name: "Structure Therapeutics", exposure: "Oral GLP-1 bet" },
      { ticker: "AMGN", name: "Amgen", exposure: "MariTide in development" },
    ],
  },
  ai: {
    themeName: "AI Infrastructure",
    themeDescription: "AI infrastructure spending is accelerating as enterprises race to deploy LLMs and generative AI. The picks-and-shovels plays are seeing massive demand.",
    whyThisPick: "NVIDIA is the undisputed leader in AI compute. H100/H200 GPUs are sold out, and their CUDA moat is deep. Every major AI lab and enterprise is a customer. This is the cleanest AI exposure.",
    relatedTickers: [
      { ticker: "AMD", name: "AMD", exposure: "MI300 GPU alternative" },
      { ticker: "AVGO", name: "Broadcom", exposure: "Custom AI chips, networking" },
      { ticker: "SMCI", name: "Super Micro", exposure: "AI server systems" },
      { ticker: "MRVL", name: "Marvell", exposure: "Custom AI silicon" },
    ],
  },
  bitcoin: {
    themeName: "Bitcoin / Crypto Proxy",
    themeDescription: "For leveraged Bitcoin exposure without holding BTC directly, equity proxies offer amplified moves with traditional market access.",
    whyThisPick: "MicroStrategy is a leveraged Bitcoin bet — they hold 402,100 BTC and actively buy more. When BTC moves, MSTR moves harder. It's the highest-beta liquid Bitcoin proxy available.",
    relatedTickers: [
      { ticker: "COIN", name: "Coinbase", exposure: "Crypto exchange, diversified" },
      { ticker: "MARA", name: "Marathon Digital", exposure: "Bitcoin miner" },
      { ticker: "RIOT", name: "Riot Platforms", exposure: "Bitcoin miner" },
      { ticker: "IBIT", name: "iShares Bitcoin ETF", exposure: "Direct BTC (1:1)" },
    ],
  },
  energy: {
    themeName: "Nuclear / Clean Energy",
    themeDescription: "Nuclear energy is having a renaissance as AI data centers need massive baseload power and governments push for clean energy. Uranium and nuclear operators are benefiting.",
    whyThisPick: "Constellation Energy operates the largest nuclear fleet in the US and just signed a landmark deal to power Microsoft's AI data centers. They have pricing power and growing demand.",
    relatedTickers: [
      { ticker: "VST", name: "Vistra", exposure: "Nuclear + natural gas generation" },
      { ticker: "CCJ", name: "Cameco", exposure: "Uranium producer" },
      { ticker: "SMR", name: "NuScale Power", exposure: "Small modular reactors" },
      { ticker: "UEC", name: "Uranium Energy", exposure: "US uranium miner" },
    ],
  },
};

export const mockBeliefResponses: Record<string, {
  intent: ParsedIntent;
  best: TradeSuggestion;
  alternatives: AlternativeTrade[];
  isThematic?: boolean;
  themeInfo?: typeof themeExplanations.peptides;
}> = {
  peptides: {
    isThematic: true,
    themeInfo: themeExplanations.peptides,
    intent: {
      assets: ["LLY"],
      direction: "long",
      timeframeHours: 720, // 30 days
      confidence: 0.82,
      summary: "Bullish on GLP-1 / Peptides theme",
    },
    best: {
      id: "lly-long-30d",
      label: "LLY Long (30-Day Window)",
      ticker: "LLY",
      name: "Eli Lilly",
      venue: "Hyperliquid",
      direction: "long",
      leverage: 2,
      sizeUsd: 100,
      timeframeHours: 720,
      stopLossPct: -12,
      takeProfitPct: 25,
      riskLevel: "moderate",
      explanation: "Eli Lilly is the highest-momentum play in GLP-1. Zepbound is taking market share from Novo Nordisk, revenue growth is 48% vs NVO's 31%, and their oral pipeline is ahead. This gives you concentrated peptide exposure with strong fundamentals.",
      currentPrice: 782.45,
      priceChange24h: 18.62,
      priceChangePct24h: 2.44,
      stats: {
        prevClose: 763.83,
        open: 768.20,
        dayRange: "$765.10 - $789.30",
        weekRange52: "$544.83 - $972.53",
        volume: "2.8M",
        marketCap: "$743B",
        peRatio: 78.2,
        eps: 10.01,
      },
      payoffPreview: {
        maxGainUsd: 50,
        maxLossUsd: 24,
        maxGainPct: 50,
        maxLossPct: -24,
      },
    },
    alternatives: [
      {
        id: "nvo-long-safe",
        label: "NVO Long (Market Leader)",
        ticker: "NVO",
        name: "Novo Nordisk",
        venue: "Hyperliquid",
        direction: "long",
        leverage: 1.5,
        sizeUsd: 100,
        timeframeHours: 720,
        stopLossPct: -10,
        takeProfitPct: 20,
        riskLevel: "safe",
        explanation: "Market leader in GLP-1. Lower growth but dominant position with Ozempic and Wegovy.",
        currentPrice: 118.42,
        priceChange24h: 1.86,
        priceChangePct24h: 1.60,
        stats: {
          prevClose: 116.56,
          open: 117.20,
          dayRange: "$116.80 - $119.50",
          weekRange52: "$86.42 - $138.52",
          volume: "4.2M",
          marketCap: "$528B",
          peRatio: 45.3,
          eps: 2.61,
        },
        payoffPreview: {
          maxGainUsd: 30,
          maxLossUsd: 15,
          maxGainPct: 30,
          maxLossPct: -15,
        },
        variant: "safer",
      },
      {
        id: "vktx-long-degen",
        label: "VKTX Long (Pure-Play Biotech)",
        ticker: "VKTX",
        name: "Viking Therapeutics",
        venue: "Hyperliquid",
        direction: "long",
        leverage: 3,
        sizeUsd: 100,
        timeframeHours: 336,
        stopLossPct: -25,
        takeProfitPct: 75,
        riskLevel: "aggressive",
        explanation: "Pure-play GLP-1 biotech with VK2735 in trials. Binary risk but massive upside if data hits.",
        currentPrice: 52.38,
        priceChange24h: 3.42,
        priceChangePct24h: 6.98,
        stats: {
          prevClose: 48.96,
          open: 49.80,
          dayRange: "$48.50 - $54.20",
          weekRange52: "$9.42 - $89.90",
          volume: "8.1M",
          marketCap: "$5.2B",
        },
        payoffPreview: {
          maxGainUsd: 225,
          maxLossUsd: 75,
          maxGainPct: 225,
          maxLossPct: -75,
        },
        variant: "riskier",
      },
    ],
  },
  ai: {
    isThematic: true,
    themeInfo: themeExplanations.ai,
    intent: {
      assets: ["NVDA"],
      direction: "long",
      timeframeHours: 336,
      confidence: 0.88,
      summary: "Bullish on AI infrastructure",
    },
    best: {
      id: "nvda-long-2w",
      label: "NVDA Long (2-Week Window)",
      ticker: "NVDA",
      name: "NVIDIA",
      venue: "Hyperliquid",
      direction: "long",
      leverage: 2,
      sizeUsd: 100,
      timeframeHours: 336,
      stopLossPct: -10,
      takeProfitPct: 20,
      riskLevel: "moderate",
      explanation: "NVIDIA is the undisputed AI compute leader. H100/H200 GPUs are sold out through 2025, CUDA moat is deep, and every major AI lab is a customer. Cleanest AI exposure available.",
      currentPrice: 141.82,
      priceChange24h: 4.26,
      priceChangePct24h: 3.10,
      stats: {
        prevClose: 137.56,
        open: 138.90,
        dayRange: "$138.20 - $143.50",
        weekRange52: "$45.01 - $152.89",
        volume: "312M",
        marketCap: "$3.48T",
        peRatio: 54.8,
        eps: 2.59,
      },
      payoffPreview: {
        maxGainUsd: 40,
        maxLossUsd: 20,
        maxGainPct: 40,
        maxLossPct: -20,
      },
    },
    alternatives: [
      {
        id: "smci-long-risky",
        label: "SMCI Long (AI Servers)",
        ticker: "SMCI",
        name: "Super Micro Computer",
        venue: "Hyperliquid",
        direction: "long",
        leverage: 2.5,
        sizeUsd: 100,
        timeframeHours: 168,
        stopLossPct: -20,
        takeProfitPct: 40,
        riskLevel: "aggressive",
        explanation: "AI server infrastructure play. Higher volatility but direct exposure to data center buildout.",
        currentPrice: 42.18,
        priceChange24h: 2.86,
        priceChangePct24h: 7.28,
        stats: {
          prevClose: 39.32,
          open: 40.10,
          dayRange: "$39.80 - $43.60",
          weekRange52: "$17.25 - $122.90",
          volume: "48M",
          marketCap: "$24.8B",
          peRatio: 15.2,
          eps: 2.77,
        },
        payoffPreview: {
          maxGainUsd: 100,
          maxLossUsd: 50,
          maxGainPct: 100,
          maxLossPct: -50,
        },
        variant: "riskier",
      },
    ],
  },
  nuclear: {
    isThematic: true,
    themeInfo: themeExplanations.energy,
    intent: {
      assets: ["CEG"],
      direction: "long",
      timeframeHours: 720,
      confidence: 0.75,
      summary: "Bullish on nuclear energy renaissance",
    },
    best: {
      id: "ceg-long-30d",
      label: "CEG Long (30-Day Window)",
      ticker: "CEG",
      name: "Constellation Energy",
      venue: "Hyperliquid",
      direction: "long",
      leverage: 1.5,
      sizeUsd: 100,
      timeframeHours: 720,
      stopLossPct: -12,
      takeProfitPct: 25,
      riskLevel: "moderate",
      explanation: "Constellation operates the largest US nuclear fleet and just signed a 20-year deal to power Microsoft's AI data centers. They have pricing power as AI drives electricity demand.",
      currentPrice: 262.84,
      priceChange24h: 8.42,
      priceChangePct24h: 3.31,
      stats: {
        prevClose: 254.42,
        open: 256.80,
        dayRange: "$255.20 - $268.90",
        weekRange52: "$102.34 - $282.49",
        volume: "3.8M",
        marketCap: "$83.2B",
        peRatio: 28.4,
        eps: 9.25,
      },
      payoffPreview: {
        maxGainUsd: 37.5,
        maxLossUsd: 18,
        maxGainPct: 37.5,
        maxLossPct: -18,
      },
    },
    alternatives: [
      {
        id: "ccj-long-uranium",
        label: "CCJ Long (Uranium Play)",
        ticker: "CCJ",
        name: "Cameco",
        venue: "Hyperliquid",
        direction: "long",
        leverage: 2,
        sizeUsd: 100,
        timeframeHours: 720,
        stopLossPct: -15,
        takeProfitPct: 35,
        riskLevel: "moderate",
        explanation: "Upstream uranium play. Benefits from nuclear buildout globally as fuel demand increases.",
        currentPrice: 52.86,
        priceChange24h: 1.24,
        priceChangePct24h: 2.40,
        stats: {
          prevClose: 51.62,
          open: 52.10,
          dayRange: "$51.80 - $53.90",
          weekRange52: "$32.18 - $62.45",
          volume: "4.2M",
          marketCap: "$22.9B",
        },
        payoffPreview: {
          maxGainUsd: 70,
          maxLossUsd: 30,
          maxGainPct: 70,
          maxLossPct: -30,
        },
        variant: "riskier",
      },
    ],
  },
  default: {
    intent: {
      assets: ["SOL"],
      direction: "long",
      timeframeHours: 24,
      confidence: 0.85,
      summary: "Bullish on SOL short-term",
    },
    best: {
      id: "sol-long-24h",
      label: "SOL Long (24h Window)",
      ticker: "SOL",
      name: "Solana",
      venue: "Hyperliquid",
      direction: "long",
      leverage: 2,
      sizeUsd: 100,
      timeframeHours: 24,
      stopLossPct: -8,
      takeProfitPct: 15,
      riskLevel: "moderate",
      explanation: "Based on your belief that SOL will pump, a 2x leveraged long position captures upside while limiting downside risk. 24h window aligns with your short-term thesis.",
      currentPrice: 224.67,
      priceChange24h: 8.43,
      priceChangePct24h: 3.89,
      stats: {
        prevClose: 216.24,
        open: 218.50,
        dayRange: "$215.32 - $228.91",
        weekRange52: "$18.21 - $264.63",
        volume: "2.4B",
        marketCap: "$108.2B",
      },
      payoffPreview: {
        maxGainUsd: 30,
        maxLossUsd: 16,
        maxGainPct: 30,
        maxLossPct: -16,
      },
    },
    alternatives: [
      {
        id: "sol-long-safe",
        label: "SOL Long (No Leverage)",
        ticker: "SOL",
        name: "Solana",
        venue: "Hyperliquid",
        direction: "long",
        leverage: 1,
        sizeUsd: 100,
        timeframeHours: 48,
        stopLossPct: -5,
        takeProfitPct: 10,
        riskLevel: "safe",
        explanation: "Lower risk spot-equivalent position with tighter stops.",
        currentPrice: 224.67,
        priceChange24h: 8.43,
        priceChangePct24h: 3.89,
        stats: {
          prevClose: 216.24,
          open: 218.50,
          dayRange: "$215.32 - $228.91",
          weekRange52: "$18.21 - $264.63",
          volume: "2.4B",
          marketCap: "$108.2B",
        },
        payoffPreview: {
          maxGainUsd: 10,
          maxLossUsd: 5,
          maxGainPct: 10,
          maxLossPct: -5,
        },
        variant: "safer",
      },
      {
        id: "sol-long-degen",
        label: "SOL Long (5x Leverage)",
        ticker: "SOL",
        name: "Solana",
        venue: "Drift",
        direction: "long",
        leverage: 5,
        sizeUsd: 100,
        timeframeHours: 12,
        stopLossPct: -15,
        takeProfitPct: 40,
        riskLevel: "aggressive",
        explanation: "High conviction play with 5x leverage. Higher risk, higher reward.",
        currentPrice: 224.67,
        priceChange24h: 8.43,
        priceChangePct24h: 3.89,
        stats: {
          prevClose: 216.24,
          open: 218.50,
          dayRange: "$215.32 - $228.91",
          weekRange52: "$18.21 - $264.63",
          volume: "2.4B",
          marketCap: "$108.2B",
        },
        payoffPreview: {
          maxGainUsd: 200,
          maxLossUsd: 75,
          maxGainPct: 200,
          maxLossPct: -75,
        },
        variant: "riskier",
      },
    ],
  },
  mstr: {
    isThematic: true,
    themeInfo: themeExplanations.bitcoin,
    intent: {
      assets: ["MSTR"],
      direction: "long",
      timeframeHours: 168,
      confidence: 0.72,
      summary: "Bullish on Bitcoin via MSTR proxy",
    },
    best: {
      id: "mstr-long-1w",
      label: "MSTR Long (1 Week Window)",
      ticker: "MSTR",
      name: "MicroStrategy",
      venue: "Hyperliquid",
      direction: "long",
      leverage: 1.5,
      sizeUsd: 100,
      timeframeHours: 168,
      stopLossPct: -12,
      takeProfitPct: 25,
      riskLevel: "moderate",
      explanation: "MicroStrategy holds 402,100 BTC and actively buys more. When BTC moves, MSTR moves harder. It's the highest-beta liquid Bitcoin proxy for leveraged crypto exposure.",
      currentPrice: 388.39,
      priceChange24h: 17.06,
      priceChangePct24h: 4.59,
      stats: {
        prevClose: 371.33,
        open: 375.26,
        dayRange: "$372.64 - $395.44",
        weekRange52: "$43.87 - $543.00",
        volume: "26M",
        marketCap: "$94.11B",
        peRatio: -42.5,
        eps: -9.12,
      },
      payoffPreview: {
        maxGainUsd: 37.5,
        maxLossUsd: 18,
        maxGainPct: 37.5,
        maxLossPct: -18,
      },
    },
    alternatives: [
      {
        id: "coin-long",
        label: "COIN Long (Diversified Crypto)",
        ticker: "COIN",
        name: "Coinbase",
        venue: "Hyperliquid",
        direction: "long",
        leverage: 2,
        sizeUsd: 100,
        timeframeHours: 168,
        stopLossPct: -15,
        takeProfitPct: 30,
        riskLevel: "moderate",
        explanation: "Broader crypto exposure through the leading US exchange. Benefits from trading volume across all tokens.",
        currentPrice: 312.45,
        priceChange24h: 12.86,
        priceChangePct24h: 4.29,
        stats: {
          prevClose: 299.59,
          open: 302.80,
          dayRange: "$298.50 - $318.90",
          weekRange52: "$114.51 - $349.75",
          volume: "8.4M",
          marketCap: "$78.2B",
        },
        payoffPreview: {
          maxGainUsd: 60,
          maxLossUsd: 30,
          maxGainPct: 60,
          maxLossPct: -30,
        },
        variant: "safer",
      },
    ],
  },
  btc: {
    isThematic: true,
    themeInfo: themeExplanations.bitcoin,
    intent: {
      assets: ["BTC"],
      direction: "long",
      timeframeHours: 72,
      confidence: 0.78,
      summary: "Bullish on Bitcoin mid-term",
    },
    best: {
      id: "btc-long-3d",
      label: "BTC Long (3 Day Window)",
      ticker: "BTC",
      name: "Bitcoin",
      venue: "Hyperliquid",
      direction: "long",
      leverage: 2,
      sizeUsd: 100,
      timeframeHours: 72,
      stopLossPct: -6,
      takeProfitPct: 12,
      riskLevel: "moderate",
      explanation: "Bitcoin looking strong. 2x leverage with a 3-day window captures the expected move while managing volatility risk.",
      currentPrice: 96842.50,
      priceChange24h: 2341.20,
      priceChangePct24h: 2.48,
      stats: {
        prevClose: 94501.30,
        open: 95120.00,
        dayRange: "$94,200 - $97,850",
        weekRange52: "$38,500 - $99,800",
        volume: "32.1B",
        marketCap: "$1.92T",
      },
      payoffPreview: {
        maxGainUsd: 24,
        maxLossUsd: 12,
        maxGainPct: 24,
        maxLossPct: -12,
      },
    },
    alternatives: [],
  },
  eth: {
    intent: {
      assets: ["ETH"],
      direction: "short",
      timeframeHours: 24,
      confidence: 0.65,
      summary: "Bearish on ETH short-term",
    },
    best: {
      id: "eth-short-24h",
      label: "ETH Short (24h Window)",
      ticker: "ETH",
      name: "Ethereum",
      venue: "Hyperliquid",
      direction: "short",
      leverage: 2,
      sizeUsd: 100,
      timeframeHours: 24,
      stopLossPct: -10,
      takeProfitPct: 15,
      riskLevel: "moderate",
      explanation: "You're bearish on ETH. A 2x short position lets you profit from downside with defined risk.",
      currentPrice: 3642.18,
      priceChange24h: -87.42,
      priceChangePct24h: -2.34,
      stats: {
        prevClose: 3729.60,
        open: 3698.20,
        dayRange: "$3,580 - $3,720",
        weekRange52: "$2,120 - $4,090",
        volume: "18.4B",
        marketCap: "$438B",
      },
      payoffPreview: {
        maxGainUsd: 30,
        maxLossUsd: 20,
        maxGainPct: 30,
        maxLossPct: -20,
      },
    },
    alternatives: [],
  },
};

export function parseBeliefToResponse(belief: string): {
  intent: ParsedIntent;
  best: TradeSuggestion;
  alternatives: AlternativeTrade[];
  isThematic?: boolean;
  themeInfo?: typeof themeExplanations.peptides;
} {
  const lowerBelief = belief.toLowerCase();
  
  // Check for thematic beliefs first
  if (lowerBelief.includes("peptide") || lowerBelief.includes("glp-1") || lowerBelief.includes("ozempic") || lowerBelief.includes("wegovy") || lowerBelief.includes("weight loss drug") || lowerBelief.includes("mounjaro") || lowerBelief.includes("zepbound")) {
    return mockBeliefResponses.peptides;
  }
  
  if (lowerBelief.includes("ai ") || lowerBelief.includes("artificial intelligence") || lowerBelief.includes("gpu") || lowerBelief.includes("nvidia") || lowerBelief.includes("nvda") || lowerBelief.includes("chips") || lowerBelief.includes("data center")) {
    return mockBeliefResponses.ai;
  }
  
  if (lowerBelief.includes("nuclear") || lowerBelief.includes("uranium") || lowerBelief.includes("clean energy") || lowerBelief.includes("power grid") || lowerBelief.includes("electricity demand")) {
    return mockBeliefResponses.nuclear;
  }
  
  // Check for specific tickers
  if (lowerBelief.includes("mstr") || lowerBelief.includes("microstrategy")) {
    return mockBeliefResponses.mstr;
  }
  if (lowerBelief.includes("btc") || lowerBelief.includes("bitcoin")) {
    return mockBeliefResponses.btc;
  }
  if (lowerBelief.includes("eth") || lowerBelief.includes("ethereum")) {
    return mockBeliefResponses.eth;
  }
  if (lowerBelief.includes("sol") || lowerBelief.includes("solana")) {
    return mockBeliefResponses.default;
  }
  
  // Default to SOL
  return mockBeliefResponses.default;
}

export const fastPlaySuggestion: TradeSuggestion = {
  id: "fast-sol-momentum",
  label: "SOL Momentum Play (2h)",
  ticker: "SOL",
  name: "Solana",
  venue: "Hyperliquid",
  direction: "long",
  leverage: 3,
  sizeUsd: 50,
  timeframeHours: 2,
  stopLossPct: -5,
  takeProfitPct: 8,
  riskLevel: "aggressive",
  explanation: "Highest momentum setup right now. SOL showing strong buying pressure with volume confirmation. Quick 2-hour window to capture the move.",
  currentPrice: 224.67,
  priceChange24h: 8.43,
  priceChangePct24h: 3.89,
  stats: {
    prevClose: 216.24,
    open: 218.50,
    dayRange: "$215.32 - $228.91",
    weekRange52: "$18.21 - $264.63",
    volume: "2.4B",
    marketCap: "$108.2B",
  },
  payoffPreview: {
    maxGainUsd: 12,
    maxLossUsd: 7.5,
    maxGainPct: 24,
    maxLossPct: -15,
  },
};
