/**
 * Chart Overlay Renderer Component
 * =================================
 * 
 * A React component that draws technical analysis annotations on chart images
 * using HTML Canvas. This serves as a fallback when Gemini's image generation
 * is unavailable or fails.
 * 
 * ## Architecture
 * 
 * ```
 * ChartAnalysis (from analyzeChart)
 *        ↓
 * generateAnnotationPlan() → AnnotationPlan
 *        ↓
 * ChartOverlayRenderer → Canvas with annotations
 * ```
 * 
 * ## What It Draws
 * 
 * 1. **Support Zones** - Green semi-transparent bands
 * 2. **Resistance Zones** - Red semi-transparent bands
 * 3. **Range Boxes** - Blue rectangles for ranging markets
 * 4. **Pivot Markers** - Circle markers for HH/HL/LH/LL
 * 5. **Fakeout Markers** - Triangle warnings for failed breakouts
 * 6. **Current Price Line** - Dashed yellow line
 * 
 * ## Usage
 * 
 * ```tsx
 * import { generateAnnotationPlan } from "@/lib/chart-analysis";
 * import ChartOverlayRenderer from "@/components/ChartOverlayRenderer";
 * 
 * // Generate plan from analysis
 * const plan = generateAnnotationPlan(analysis);
 * 
 * // Render the annotated chart
 * <ChartOverlayRenderer
 *   imageBase64={originalChartBase64}
 *   plan={plan}
 *   analysis={analysis}
 *   onRenderComplete={(dataUrl) => {
 *     // Optional: get the rendered image as data URL
 *   }}
 * />
 * ```
 * 
 * ## Customization
 * 
 * To customize colors, modify the COLORS object below.
 * To add new mark types, add cases to the drawMark function.
 * 
 * @module ChartOverlayRenderer
 */

"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { AnnotationPlan, AnnotationMark, ChartAnalysis } from "@/lib/chart-analysis";

// ============================================
// PROPS INTERFACE
// ============================================

interface ChartOverlayRendererProps {
  /** Base64-encoded original chart image */
  imageBase64: string;
  /** Annotation plan from generateAnnotationPlan() */
  plan: AnnotationPlan;
  /** Full analysis (used for price range calculation) */
  analysis: ChartAnalysis;
  /** Optional callback when rendering completes */
  onRenderComplete?: (dataUrl: string) => void;
}

// ============================================
// COLOR SCHEMES
// ============================================

/**
 * Color palettes for dark and light themes.
 * 
 * Each color includes appropriate alpha values for zones vs lines.
 * Zones use lower opacity to keep candles visible.
 * 
 * To customize:
 * - Increase zone opacity if annotations are too faint
 * - Decrease if candles are obscured
 * - Use rgba() format for precise control
 */
const COLORS = {
  dark: {
    // Support (bullish) colors
    support: "rgba(34, 197, 94, 0.8)",       // Solid line color (green-500)
    supportZone: "rgba(34, 197, 94, 0.15)",  // Zone fill (very transparent)
    
    // Resistance (bearish) colors
    resistance: "rgba(239, 68, 68, 0.8)",    // Solid line color (red-500)
    resistanceZone: "rgba(239, 68, 68, 0.15)", // Zone fill
    
    // Current price indicator
    currentPrice: "rgba(250, 204, 21, 0.9)", // Dashed line (yellow-400)
    
    // Range box for ranging markets
    rangeBox: "rgba(59, 130, 246, 0.1)",     // Fill (blue-500, very light)
    rangeBorder: "rgba(59, 130, 246, 0.5)",  // Border (dashed)
    
    // Pivot markers (market structure)
    pivotHigh: "rgba(34, 197, 94, 0.9)",     // HH/HL markers (green)
    pivotLow: "rgba(239, 68, 68, 0.9)",      // LH/LL markers (red)
    
    // Fakeout warnings
    fakeout: "rgba(251, 191, 36, 0.8)",      // Triangle markers (amber-400)
    
    // Text labels
    label: "rgba(255, 255, 255, 0.95)",      // Text color
    labelBg: "rgba(0, 0, 0, 0.7)",           // Label background
  },
  light: {
    support: "rgba(22, 163, 74, 0.9)",
    supportZone: "rgba(22, 163, 74, 0.12)",
    resistance: "rgba(220, 38, 38, 0.9)",
    resistanceZone: "rgba(220, 38, 38, 0.12)",
    currentPrice: "rgba(202, 138, 4, 0.9)",
    rangeBox: "rgba(59, 130, 246, 0.08)",
    rangeBorder: "rgba(59, 130, 246, 0.4)",
    pivotHigh: "rgba(22, 163, 74, 0.9)",
    pivotLow: "rgba(220, 38, 38, 0.9)",
    fakeout: "rgba(245, 158, 11, 0.8)",
    label: "rgba(0, 0, 0, 0.9)",
    labelBg: "rgba(255, 255, 255, 0.85)",
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Renders chart annotations on a canvas overlay.
 * 
 * The component:
 * 1. Loads the original chart image
 * 2. Sets canvas dimensions to match
 * 3. Draws the original image
 * 4. Draws each annotation mark on top
 * 
 * All drawing is done in a single render pass for performance.
 */
export function ChartOverlayRenderer({
  imageBase64,
  plan,
  analysis,
  onRenderComplete,
}: ChartOverlayRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState(false);

  // ============================================
  // PRICE RANGE CALCULATION
  // ============================================
  
  /**
   * Calculate the price range to map Y coordinates.
   * 
   * We need to know the min/max prices to convert
   * dollar values to pixel positions on the canvas.
   * 
   * This collects all prices from:
   * - Current price
   * - Key zones
   * - Range box bounds
   * - Pivot points
   * 
   * Then adds 15% padding on each side.
   */
  const getPriceRange = useCallback(() => {
    const prices: number[] = [];
    
    // Include current price
    if (analysis.currentPrice > 0) prices.push(analysis.currentPrice);
    
    // Include all zone prices
    analysis.keyZones.forEach(zone => {
      if (zone.price > 0) prices.push(zone.price);
    });
    
    // Include range box bounds
    if (analysis.rangeBox) {
      if (analysis.rangeBox.high > 0) prices.push(analysis.rangeBox.high);
      if (analysis.rangeBox.low > 0) prices.push(analysis.rangeBox.low);
    }
    
    // Include pivot prices
    if (analysis.pivots) {
      analysis.pivots.points.forEach(p => {
        if (p.price > 0) prices.push(p.price);
      });
    }
    
    // Default range if no prices found
    if (prices.length === 0) return { min: 0, max: 100 };
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    // Add 15% padding on each side
    const padding = (max - min) * 0.15;
    
    return { min: min - padding, max: max + padding };
  }, [analysis]);

  // ============================================
  // MAIN RENDER FUNCTION
  // ============================================
  
  /**
   * Main rendering function.
   * Loads image, draws base chart, then overlays annotations.
   */
  const renderOverlay = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load the original chart image
    const img = new Image();
    img.src = `data:image/png;base64,${imageBase64}`;
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
    });

    // Match canvas size to image
    canvas.width = img.width;
    canvas.height = img.height;
    setDimensions({ width: img.width, height: img.height });

    // Draw the original chart as base layer
    ctx.drawImage(img, 0, 0);

    // ============================================
    // CHART AREA ESTIMATION
    // ============================================
    
    /**
     * Estimate the actual chart plotting area within the image.
     * 
     * Most chart screenshots have:
     * - Left margin (~8%) for Y-axis labels
     * - Right margin (~8%) for price axis
     * - Top margin (~5%) for header
     * - Bottom margin (~12%) for X-axis/dates
     * 
     * Adjust these percentages if your charts have different layouts.
     */
    const chartArea = {
      left: img.width * 0.08,    // Left edge of chart area
      right: img.width * 0.92,   // Right edge of chart area
      top: img.height * 0.05,    // Top edge of chart area
      bottom: img.height * 0.88, // Bottom edge of chart area
    };

    // Select color scheme based on theme
    const colors = plan.theme === "dark" ? COLORS.dark : COLORS.light;

    // Draw each annotation mark
    for (const mark of plan.marks) {
      drawMark(ctx, mark, chartArea, colors);
    }

    // ============================================
    // STORY LABEL (optional)
    // ============================================
    
    // Add story summary in top-left if short enough
    if (plan.story && plan.story.length < 100) {
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = colors.labelBg;
      const textWidth = Math.min(ctx.measureText(plan.story).width, chartArea.right - chartArea.left - 40);
      ctx.fillRect(chartArea.left + 10, chartArea.top + 10, textWidth + 16, 22);
      ctx.fillStyle = colors.label;
      ctx.fillText(plan.story.substring(0, 80) + (plan.story.length > 80 ? "..." : ""), chartArea.left + 18, chartArea.top + 25);
    }

    setRendered(true);
    
    // Provide rendered image to callback
    if (onRenderComplete) {
      const dataUrl = canvas.toDataURL("image/png");
      onRenderComplete(dataUrl);
    }
  }, [imageBase64, plan, getPriceRange, onRenderComplete]);

  // ============================================
  // MARK DRAWING FUNCTION
  // ============================================
  
  /**
   * Draw a single annotation mark on the canvas.
   * 
   * This is the core drawing logic. Each mark type has specific
   * rendering rules:
   * 
   * - **zone**: Semi-transparent horizontal band + center line
   * - **line**: Horizontal line (solid or dashed)
   * - **label**: Text with background
   * - **range_box**: Rectangle with dashed border
   * - **pivot**: Circle marker with label
   * - **fakeout**: Warning triangle with label
   * 
   * @param ctx - Canvas 2D rendering context
   * @param mark - The annotation mark to draw
   * @param chartArea - Bounds of the chart plotting area
   * @param colors - Color scheme to use
   */
  const drawMark = (
    ctx: CanvasRenderingContext2D,
    mark: AnnotationMark,
    chartArea: { left: number; right: number; top: number; bottom: number },
    colors: typeof COLORS.dark
  ) => {
    const priceRange = getPriceRange();
    const chartHeight = chartArea.bottom - chartArea.top;
    
    /**
     * Convert a price to a Y coordinate on the canvas.
     * 
     * Canvas Y increases downward, but prices increase upward,
     * so we subtract from bottom.
     */
    const toY = (price: number) => {
      const normalized = (price - priceRange.min) / (priceRange.max - priceRange.min);
      return chartArea.bottom - (normalized * chartHeight);
    };

    switch (mark.type) {
      // ========== ZONE (Support/Resistance Band) ==========
      case "zone": {
        const y1 = toY(mark.priceHigh || mark.price || 0);
        const y2 = toY(mark.priceLow || mark.price || 0);
        const zoneColor = mark.role === "support" ? colors.supportZone : colors.resistanceZone;
        
        // Draw semi-transparent zone fill
        ctx.fillStyle = zoneColor;
        ctx.globalAlpha = mark.opacity || 0.18;
        ctx.fillRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
        ctx.globalAlpha = 1;
        
        // Draw center line through the zone
        const centerY = (y1 + y2) / 2;
        const lineColor = mark.role === "support" ? colors.support : colors.resistance;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]); // Solid line
        ctx.beginPath();
        ctx.moveTo(chartArea.left, centerY);
        ctx.lineTo(chartArea.right, centerY);
        ctx.stroke();
        break;
      }
      
      // ========== LINE (Current Price, etc.) ==========
      case "line": {
        const y = toY(mark.price || 0);
        
        // Select color based on role
        const lineColor = mark.role === "current_price" ? colors.currentPrice :
                         mark.role === "support" ? colors.support :
                         colors.resistance;
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        
        // Apply dash pattern if specified
        ctx.setLineDash(mark.style === "dashed" ? [6, 4] : []);
        
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        
        // Reset dash pattern
        ctx.setLineDash([]);
        break;
      }
      
      // ========== LABEL (Text with Background) ==========
      case "label": {
        const y = toY(mark.price || 0);
        const text = mark.text || "";
        
        ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
        const textWidth = ctx.measureText(text).width;
        
        // Position label near right edge of chart
        const labelX = chartArea.right - textWidth - 20;
        const labelY = y;
        
        // Draw background rectangle
        ctx.fillStyle = colors.labelBg;
        ctx.fillRect(labelX - 4, labelY - 10, textWidth + 8, 16);
        
        // Draw text with role-appropriate color
        const textColor = mark.role === "support" ? colors.support :
                         mark.role === "resistance" ? colors.resistance :
                         colors.label;
        ctx.fillStyle = textColor;
        ctx.fillText(text, labelX, labelY + 2);
        break;
      }
      
      // ========== RANGE BOX (For Ranging Markets) ==========
      case "range_box": {
        const y1 = toY(mark.priceHigh || 0);
        const y2 = toY(mark.priceLow || 0);
        
        // Draw semi-transparent fill
        ctx.fillStyle = colors.rangeBox;
        ctx.globalAlpha = mark.opacity || 0.08;
        ctx.fillRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
        ctx.globalAlpha = 1;
        
        // Draw dashed border
        ctx.strokeStyle = colors.rangeBorder;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
        ctx.setLineDash([]);
        
        // Add "RANGE" label in top-left of box
        ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = colors.rangeBorder;
        ctx.fillText("RANGE", chartArea.left + 8, Math.min(y1, y2) + 14);
        break;
      }
      
      // ========== PIVOT (Market Structure Marker) ==========
      case "pivot": {
        const y = toY(mark.price || 0);
        const isHigherPivot = mark.role === "pivot_hh" || mark.role === "pivot_hl";
        const pivotColor = isHigherPivot ? colors.pivotHigh : colors.pivotLow;
        
        // Position marker near right side
        const markerX = chartArea.right - 60;
        
        // Draw filled circle marker
        ctx.fillStyle = pivotColor;
        ctx.beginPath();
        ctx.arc(markerX, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label next to marker
        ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = colors.labelBg;
        const text = mark.text || "";
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(markerX + 10, y - 8, textWidth + 6, 16);
        ctx.fillStyle = pivotColor;
        ctx.fillText(text, markerX + 13, y + 4);
        break;
      }
      
      // ========== FAKEOUT (Failed Breakout Warning) ==========
      case "fakeout": {
        const y = toY(mark.price || 0);
        const isAbove = mark.role === "fakeout_above";
        
        // Position near left side of chart
        const markerX = chartArea.left + 40;
        
        // Draw warning triangle
        ctx.fillStyle = colors.fakeout;
        ctx.beginPath();
        ctx.moveTo(markerX, y - 8);        // Top point
        ctx.lineTo(markerX - 6, y + 4);    // Bottom left
        ctx.lineTo(markerX + 6, y + 4);    // Bottom right
        ctx.closePath();
        ctx.fill();
        
        // Draw label with arrow indicating direction
        ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = colors.labelBg;
        const text = `FAKEOUT ${isAbove ? "↑" : "↓"}`;
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(markerX + 10, y - 7, textWidth + 6, 14);
        ctx.fillStyle = colors.fakeout;
        ctx.fillText(text, markerX + 13, y + 3);
        break;
      }
    }
  };

  // ============================================
  // LIFECYCLE
  // ============================================
  
  // Render when dependencies change
  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="relative">
      {/* Canvas element where annotations are drawn */}
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-lg"
        style={{ maxHeight: "70vh" }}
      />
      
      {/* Loading overlay while rendering */}
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-lg">
          <div className="text-sm text-zinc-400">Rendering overlay...</div>
        </div>
      )}
    </div>
  );
}

export default ChartOverlayRenderer;
