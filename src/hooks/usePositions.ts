"use client";

import { useState, useEffect, useCallback } from "react";
import { Position } from "@/lib/types";
import { initialPositions, ASSETS } from "@/lib/mock-data";

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>(initialPositions);

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((pos) => {
          const priceChange = (Math.random() - 0.48) * 0.002 * pos.currentPrice;
          const newPrice = pos.currentPrice + priceChange;
          const priceDiff = newPrice - pos.entryPrice;
          const direction = pos.direction === "long" ? 1 : -1;
          const newPnl = (priceDiff / pos.entryPrice) * pos.size * pos.leverage * direction;
          const newPnlPercent = (newPnl / pos.size) * 100;

          return {
            ...pos,
            currentPrice: newPrice,
            pnl: newPnl,
            pnlPercent: newPnlPercent,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const openPosition = useCallback(
    (
      asset: string,
      direction: "long" | "short",
      size: number,
      leverage: number
    ) => {
      const assetData = ASSETS[asset];
      if (!assetData) return null;

      const newPosition: Position = {
        id: `pos-${Date.now()}`,
        asset,
        assetName: assetData.name,
        direction,
        size,
        leverage,
        entryPrice: assetData.price,
        currentPrice: assetData.price,
        pnl: 0,
        pnlPercent: 0,
        liquidationPrice:
          direction === "long"
            ? assetData.price * (1 - 1 / leverage)
            : assetData.price * (1 + 1 / leverage),
        openedAt: new Date().toISOString(),
      };

      setPositions((prev) => [...prev, newPosition]);
      return newPosition;
    },
    []
  );

  const closePosition = useCallback((positionId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
  }, []);

  const closeByAsset = useCallback((asset: string) => {
    setPositions((prev) => prev.filter((p) => p.asset !== asset));
  }, []);

  const flipPosition = useCallback((positionId: string) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== positionId) return p;
        const newDirection = p.direction === "long" ? "short" : "long";
        return {
          ...p,
          direction: newDirection,
          entryPrice: p.currentPrice,
          pnl: 0,
          pnlPercent: 0,
          liquidationPrice:
            newDirection === "long"
              ? p.currentPrice * (1 - 1 / p.leverage)
              : p.currentPrice * (1 + 1 / p.leverage),
        };
      })
    );
  }, []);

  const flipByAsset = useCallback((asset: string) => {
    const position = positions.find((p) => p.asset === asset);
    if (position) {
      flipPosition(position.id);
    }
  }, [positions, flipPosition]);

  const addToPosition = useCallback((asset: string, additionalSize: number) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.asset !== asset) return p;
        const newSize = p.size + additionalSize;
        // Recalculate average entry
        const totalCost = p.size * p.entryPrice + additionalSize * p.currentPrice;
        const newEntry = totalCost / newSize;
        return {
          ...p,
          size: newSize,
          entryPrice: newEntry,
        };
      })
    );
  }, []);

  const reducePosition = useCallback((asset: string, percent: number) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.asset !== asset) return p;
        const reduction = p.size * (percent / 100);
        const newSize = p.size - reduction;
        if (newSize <= 0) {
          return p; // Will be filtered out
        }
        return {
          ...p,
          size: newSize,
          pnl: p.pnl * (newSize / p.size),
        };
      }).filter((p) => p.size > 0)
    );
  }, []);

  const closeAll = useCallback(() => {
    setPositions([]);
  }, []);

  return {
    positions,
    openPosition,
    closePosition,
    closeByAsset,
    flipPosition,
    flipByAsset,
    addToPosition,
    reducePosition,
    closeAll,
  };
}
