"use client";

import { useState, useEffect, useRef, memo } from "react";

interface MiniChartProps {
  symbol: string;
  width?: number;
  height?: number;
  className?: string;
}

interface KlineData {
  time: number;
  close: number;
}

export const MiniChart = memo(function MiniChart({ 
  symbol, 
  width = 200, 
  height = 60,
  className = "" 
}: MiniChartProps) {
  const [data, setData] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map our symbols to Binance
  const binanceSymbol = `${symbol}USDT`;

  // Fetch 24h of 15-minute candles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=15m&limit=96`
        );
        const klines = await response.json();
        
        const parsed: KlineData[] = klines.map((k: any[]) => ({
          time: k[0],
          close: parseFloat(k[4]),
        }));
        
        setData(parsed);
        setIsLoading(false);
      } catch (e) {
        console.error("Failed to fetch chart data", e);
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [binanceSymbol]);

  // Draw the chart
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Calculate bounds
    const prices = data.map(d => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Determine color based on trend
    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const isUp = lastPrice >= firstPrice;
    const lineColor = isUp ? "#20b2aa" : "#ef4444";
    const gradientColor = isUp ? "rgba(32, 178, 170, 0.1)" : "rgba(239, 68, 68, 0.1)";

    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, gradientColor);
    gradient.addColorStop(1, "transparent");

    // Draw the line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((point.close - minPrice) / priceRange) * (height - 8) - 4;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under the line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

  }, [data, width, height]);

  if (isLoading) {
    return (
      <div 
        className={`bg-[#1e1f20] rounded-lg animate-pulse ${className}`}
        style={{ width, height }}
      />
    );
  }

  if (data.length === 0) {
    return null;
  }

  // Calculate 24h change for display
  const firstPrice = data[0]?.close || 0;
  const lastPrice = data[data.length - 1]?.close || 0;
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;
  const isUp = change >= 0;

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className="rounded-lg"
      />
      <div className="absolute bottom-1 right-1 text-[10px] font-mono bg-[#191a1a]/80 px-1 rounded">
        <span className={isUp ? "text-[#20b2aa]" : "text-red-400"}>
          {isUp ? "+" : ""}{change.toFixed(1)}%
        </span>
        <span className="text-[#6b6c6d] ml-1">24h</span>
      </div>
    </div>
  );
});

