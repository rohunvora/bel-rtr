"use client";

import { useState, useEffect, useMemo, memo } from "react";

interface SparklineProps {
  symbol: string;
  width?: number;
  height?: number;
  showChange?: boolean;
  className?: string;
}

interface PricePoint {
  time: number;
  price: number;
}

// Smooth the path using cardinal spline
function smoothPath(points: { x: number; y: number }[], tension = 0.3): string {
  if (points.length < 2) return "";
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  return path;
}

export const Sparkline = memo(function Sparkline({ 
  symbol, 
  width = 120, 
  height = 40,
  showChange = true,
  className = "" 
}: SparklineProps) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Map to Binance symbol
  const binanceSymbol = `${symbol.toUpperCase()}USDT`;

  // Fetch historical data
  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        // Fetch 24h of 15-minute candles (96 points)
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=15m&limit=96`
        );
        
        if (!response.ok) throw new Error("Failed to fetch");
        
        const klines = await response.json();
        
        if (!mounted) return;
        
        const parsed: PricePoint[] = klines.map((k: (string | number)[]) => ({
          time: k[0] as number,
          price: parseFloat(k[4] as string), // Close price
        }));
        
        setData(parsed);
        setIsLoading(false);
        setError(false);
      } catch (e) {
        if (!mounted) return;
        console.error("Sparkline fetch error:", e);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [binanceSymbol]);

  // Calculate chart data
  const chartData = useMemo(() => {
    if (data.length < 2) return null;
    
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    const isUp = change >= 0;
    
    // Convert to SVG points with padding
    const padding = 2;
    const points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: padding + (1 - (d.price - minPrice) / range) * (height - padding * 2),
    }));
    
    const linePath = smoothPath(points);
    
    // Create area path (line + bottom)
    const areaPath = linePath + 
      ` L ${points[points.length - 1].x} ${height}` +
      ` L ${points[0].x} ${height} Z`;
    
    return {
      linePath,
      areaPath,
      isUp,
      change,
      lastPrice,
    };
  }, [data, width, height]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div 
        className={`relative overflow-hidden rounded ${className}`}
        style={{ width, height }}
      >
        <div className="absolute inset-0 bg-[#242526]">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
      </div>
    );
  }

  // Error or no data
  if (error || !chartData) {
    return (
      <div 
        className={`flex items-center justify-center bg-[#242526] rounded text-[10px] text-[#6b6c6d] ${className}`}
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  const { linePath, areaPath, isUp, change } = chartData;
  const gradientId = `sparkline-gradient-${symbol}`;
  const lineColor = isUp ? "#20b2aa" : "#ef4444";
  const gradientStart = isUp ? "rgba(32, 178, 170, 0.3)" : "rgba(239, 68, 68, 0.3)";
  const gradientEnd = isUp ? "rgba(32, 178, 170, 0)" : "rgba(239, 68, 68, 0)";

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          className="transition-all duration-500"
        />
        
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
        />
        
        {/* End dot */}
        <circle
          cx={width - 2}
          cy={data.length > 0 ? 
            2 + (1 - (data[data.length - 1].price - Math.min(...data.map(d => d.price))) / 
            (Math.max(...data.map(d => d.price)) - Math.min(...data.map(d => d.price)) || 1)) * (height - 4)
            : height / 2
          }
          r={2}
          fill={lineColor}
          className="animate-pulse"
        />
      </svg>
      
      {/* Change badge */}
      {showChange && (
        <div className={`absolute -bottom-0.5 -right-0.5 text-[9px] font-mono px-1 rounded ${
          isUp ? "text-[#20b2aa] bg-[#20b2aa]/10" : "text-red-400 bg-red-500/10"
        }`}>
          {isUp ? "+" : ""}{change.toFixed(1)}%
        </div>
      )}
    </div>
  );
});

// Compact sparkline for inline use (no badge)
export const SparklineInline = memo(function SparklineInline({ 
  symbol,
  width = 60,
  height = 20,
  className = ""
}: Omit<SparklineProps, "showChange">) {
  return (
    <Sparkline 
      symbol={symbol} 
      width={width} 
      height={height} 
      showChange={false}
      className={className}
    />
  );
});

