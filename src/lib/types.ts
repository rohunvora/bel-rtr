export interface Position {
  id: string;
  asset: string;
  assetName: string;
  direction: "long" | "short";
  size: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  liquidationPrice: number;
  openedAt: string;
  timeframe?: number; // hours
}

export interface PairPosition {
  id: string;
  type: "pair";
  longAsset: string;
  shortAsset: string;
  size: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  positions: [Position, Position];
}

export interface BasketPosition {
  id: string;
  type: "basket";
  name: string;
  totalSize: number;
  pnl: number;
  pnlPercent: number;
  positions: Position[];
}

export interface Mover {
  asset: string;
  assetName: string;
  price: number;
  change1h: number;
  change24h: number;
  volume24h: string;
}

export interface ParsedCommand {
  type: "trade" | "close" | "flip" | "add" | "reduce" | "closeAll" | "unknown";
  asset?: string;
  direction?: "long" | "short";
  size?: number;
  leverage?: number;
  timeframe?: string;
  percent?: number;
  error?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalExposure: number;
  netPnl: number;
  todayPnl: number;
  marginUsed: number;
  longExposure: number;
  shortExposure: number;
}

export interface Trade {
  id: string;
  asset: string;
  direction: "long" | "short";
  size: number;
  leverage: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
}
