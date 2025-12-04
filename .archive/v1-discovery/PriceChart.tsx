"use client";

import { useState } from "react";

interface PriceChartProps {
  ticker: string;
  currentPrice: number;
  priceChangePct: number;
}

type TimeRange = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export function PriceChart({ ticker, currentPrice, priceChangePct }: PriceChartProps) {
  const [activeRange, setActiveRange] = useState<TimeRange>("1D");
  const ranges: TimeRange[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];

  // Generate mock chart data
  const generateChartPath = () => {
    const isPositive = priceChangePct >= 0;
    const baseY = 60;
    const variance = 30;
    
    // Generate smooth curve points
    const points: string[] = [];
    const numPoints = 50;
    
    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * 100;
      const progress = i / numPoints;
      
      // Add some randomness but trend in the right direction
      const trendOffset = isPositive ? -progress * 20 : progress * 20;
      const noise = Math.sin(i * 0.5) * 10 + Math.cos(i * 0.3) * 5;
      const y = baseY + trendOffset + noise;
      
      points.push(`${x},${Math.max(10, Math.min(90, y))}`);
    }
    
    return `M ${points.join(" L ")}`;
  };

  const chartColor = priceChangePct >= 0 ? "#20b2aa" : "#ef4444";

  return (
    <div className="mt-4">
      {/* Time range selector */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center bg-[#1e1f20] rounded-lg p-1">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeRange === range
                  ? "bg-[#2d2e2f] text-white"
                  : "text-[#6b6c6d] hover:text-[#9a9b9c]"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
        <button className="p-2 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div className="relative h-[200px] bg-[#1e1f20] rounded-lg overflow-hidden">
        {/* Powered by label */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] text-[#6b6c6d]">
          <span>Powered by</span>
          <span className="font-medium text-[#9a9b9c]">belief router</span>
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-3 top-8 bottom-8 flex flex-col justify-between text-[10px] text-[#6b6c6d]">
          <span>${(currentPrice * 1.03).toFixed(0)}</span>
          <span>${currentPrice.toFixed(0)}</span>
          <span>${(currentPrice * 0.97).toFixed(0)}</span>
        </div>

        {/* Chart SVG */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#2d2e2f" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#2d2e2f" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#2d2e2f" strokeWidth="0.5" />
          
          {/* Previous close line */}
          <line
            x1="0"
            y1="60"
            x2="100"
            y2="60"
            stroke="#6b6c6d"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
          
          {/* Price line */}
          <path
            d={generateChartPath()}
            fill="none"
            stroke={chartColor}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Prev close label */}
        <div className="absolute right-3 top-[58%] bg-[#2d2e2f] px-2 py-0.5 rounded text-[10px] text-[#9a9b9c]">
          Prev close: ${currentPrice.toFixed(2)}
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-2 left-12 right-3 flex justify-between text-[10px] text-[#6b6c6d]">
          <span>6 AM</span>
          <span>9 AM</span>
          <span>12 PM</span>
          <span>3 PM</span>
          <span>6 PM</span>
        </div>

        {/* Volume bars (mock) */}
        <div className="absolute bottom-6 left-12 right-3 h-8 flex items-end gap-px">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[#2d2e2f] rounded-t"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
