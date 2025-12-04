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
  timeframe?: number;
}

export interface PairPosition {
  id: string;
  type: "pair";
  longAsset: string;
  shortAsset: string;
  longAssetName: string;
  shortAssetName: string;
  size: number; // size per leg
  leverage: number;
  longEntry: number;
  shortEntry: number;
  longCurrent: number;
  shortCurrent: number;
  longPnl: number;
  shortPnl: number;
  totalPnl: number;
  totalPnlPercent: number;
  openedAt: string;
}

export type AnyPosition = Position | PairPosition;

export interface Mover {
  asset: string;
  assetName: string;
  price: number;
  change1h: number;
  change24h: number;
  volume24h: string;
}

export interface ParsedCommand {
  type: "trade" | "pair" | "close" | "flip" | "add" | "reduce" | "closeAll" | "unknown";
  asset?: string;
  direction?: "long" | "short";
  size?: number;
  leverage?: number;
  // For pairs
  longAsset?: string;
  shortAsset?: string;
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
  positionCount: number;
}
