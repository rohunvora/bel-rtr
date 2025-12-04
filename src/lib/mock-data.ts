import { Position, Mover, PortfolioSummary, ParsedCommand } from "./types";

export const ASSETS: Record<string, { name: string; price: number }> = {
  BTC: { name: "Bitcoin", price: 97842.50 },
  ETH: { name: "Ethereum", price: 3642.18 },
  SOL: { name: "Solana", price: 224.67 },
  ARB: { name: "Arbitrum", price: 1.12 },
  OP: { name: "Optimism", price: 2.34 },
  WIF: { name: "dogwifhat", price: 2.71 },
  PEPE: { name: "Pepe", price: 0.0000234 },
  BONK: { name: "Bonk", price: 0.0000312 },
  DOGE: { name: "Dogecoin", price: 0.412 },
  LINK: { name: "Chainlink", price: 24.86 },
  UNI: { name: "Uniswap", price: 17.42 },
  AAVE: { name: "Aave", price: 268.50 },
  SUI: { name: "Sui", price: 4.28 },
  APT: { name: "Aptos", price: 12.84 },
  TIA: { name: "Celestia", price: 8.92 },
  JUP: { name: "Jupiter", price: 1.24 },
  PYTH: { name: "Pyth", price: 0.48 },
  JTO: { name: "Jito", price: 3.86 },
  RENDER: { name: "Render", price: 9.42 },
  FET: { name: "Fetch.ai", price: 2.18 },
  INJ: { name: "Injective", price: 34.20 },
  SEI: { name: "Sei", price: 0.68 },
};

export const initialPositions: Position[] = [
  {
    id: "pos-1",
    asset: "SOL",
    assetName: "Solana",
    direction: "long",
    size: 20000,
    leverage: 2,
    entryPrice: 218.50,
    currentPrice: 224.67,
    pnl: 564.28,
    pnlPercent: 2.82,
    liquidationPrice: 163.88,
    openedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "pos-2",
    asset: "ETH",
    assetName: "Ethereum",
    direction: "short",
    size: 10000,
    leverage: 2,
    entryPrice: 3680.00,
    currentPrice: 3642.18,
    pnl: 205.48,
    pnlPercent: 2.05,
    liquidationPrice: 4416.00,
    openedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "pos-3",
    asset: "WIF",
    assetName: "dogwifhat",
    direction: "long",
    size: 5000,
    leverage: 3,
    entryPrice: 2.84,
    currentPrice: 2.71,
    pnl: -228.17,
    pnlPercent: -4.58,
    liquidationPrice: 1.89,
    openedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const movers: Mover[] = [
  { asset: "PEPE", assetName: "Pepe", price: 0.0000234, change1h: 14.2, change24h: 28.4, volume24h: "$892M" },
  { asset: "WIF", assetName: "dogwifhat", price: 2.71, change1h: 8.7, change24h: 15.2, volume24h: "$445M" },
  { asset: "BONK", assetName: "Bonk", price: 0.0000312, change1h: 6.2, change24h: 12.8, volume24h: "$234M" },
  { asset: "SOL", assetName: "Solana", price: 224.67, change1h: 3.9, change24h: 8.2, volume24h: "$2.4B" },
  { asset: "SUI", assetName: "Sui", price: 4.28, change1h: 2.8, change24h: 6.4, volume24h: "$567M" },
  { asset: "ARB", assetName: "Arbitrum", price: 1.12, change1h: -5.2, change24h: -8.4, volume24h: "$312M" },
  { asset: "OP", assetName: "Optimism", price: 2.34, change1h: -3.8, change24h: -6.2, volume24h: "$198M" },
];

export function calculatePortfolioSummary(positions: Position[]): PortfolioSummary {
  const totalExposure = positions.reduce((sum, p) => sum + p.size, 0);
  const netPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const longExposure = positions.filter(p => p.direction === "long").reduce((sum, p) => sum + p.size, 0);
  const shortExposure = positions.filter(p => p.direction === "short").reduce((sum, p) => sum + p.size, 0);
  
  return {
    totalValue: 100000 + netPnl,
    totalExposure,
    netPnl,
    todayPnl: netPnl * 0.6, // Mock: 60% of PnL is from today
    marginUsed: (totalExposure / 100000) * 100,
    longExposure,
    shortExposure,
  };
}

export function parseCommand(input: string): ParsedCommand {
  const normalized = input.toLowerCase().trim();
  const parts = normalized.split(/\s+/);
  
  // Close all
  if (normalized === "close all" || normalized === "closeall") {
    return { type: "closeAll" };
  }
  
  // Close specific: "close sol"
  if (parts[0] === "close" && parts[1]) {
    const asset = parts[1].toUpperCase();
    if (ASSETS[asset]) {
      return { type: "close", asset };
    }
    return { type: "unknown", error: `Unknown asset: ${parts[1]}` };
  }
  
  // Flip specific: "flip eth"
  if (parts[0] === "flip" && parts[1]) {
    const asset = parts[1].toUpperCase();
    if (ASSETS[asset]) {
      return { type: "flip", asset };
    }
    return { type: "unknown", error: `Unknown asset: ${parts[1]}` };
  }
  
  // Add to position: "add 5k to sol"
  if (parts[0] === "add") {
    const sizeMatch = normalized.match(/(\d+)k?/);
    const assetMatch = normalized.match(/to\s+(\w+)/);
    if (sizeMatch && assetMatch) {
      const size = parseInt(sizeMatch[1]) * (sizeMatch[0].includes("k") ? 1000 : 1);
      const asset = assetMatch[1].toUpperCase();
      if (ASSETS[asset]) {
        return { type: "add", asset, size };
      }
    }
    return { type: "unknown", error: "Usage: add 5k to SOL" };
  }
  
  // Reduce position: "reduce sol 50%"
  if (parts[0] === "reduce") {
    const asset = parts[1]?.toUpperCase();
    const percentMatch = normalized.match(/(\d+)%/);
    if (asset && ASSETS[asset]) {
      const percent = percentMatch ? parseInt(percentMatch[1]) : 50;
      return { type: "reduce", asset, percent };
    }
    return { type: "unknown", error: "Usage: reduce SOL 50%" };
  }
  
  // Trade command: "sol long 10k 2x" or "long sol 10k 2x"
  let asset: string | undefined;
  let direction: "long" | "short" | undefined;
  let size: number | undefined;
  let leverage: number | undefined;
  
  for (const part of parts) {
    const upper = part.toUpperCase();
    
    // Check if it's an asset
    if (ASSETS[upper]) {
      asset = upper;
      continue;
    }
    
    // Check direction
    if (part === "long" || part === "l") {
      direction = "long";
      continue;
    }
    if (part === "short" || part === "s") {
      direction = "short";
      continue;
    }
    
    // Check size (10k, 5000, etc)
    const sizeMatch = part.match(/^(\d+)(k)?$/);
    if (sizeMatch) {
      size = parseInt(sizeMatch[1]) * (sizeMatch[2] ? 1000 : 1);
      continue;
    }
    
    // Check leverage (2x, 3x, etc)
    const levMatch = part.match(/^(\d+)x$/);
    if (levMatch) {
      leverage = parseInt(levMatch[1]);
      continue;
    }
  }
  
  if (asset && direction) {
    return {
      type: "trade",
      asset,
      direction,
      size: size || 1000,
      leverage: leverage || 1,
    };
  }
  
  if (parts.length > 0) {
    return { type: "unknown", error: `Could not parse: "${input}"` };
  }
  
  return { type: "unknown" };
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

export function formatPrice(price: number): string {
  if (price < 0.0001) return price.toFixed(8);
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return formatNumber(price, 2);
}

export function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}$${formatNumber(Math.abs(pnl))}`;
}

export function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
