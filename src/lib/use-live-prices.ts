"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface PriceData {
  symbol: string;
  price: number;
  prevPrice: number;
  change24h: number;
  changePercent24h: number;
  lastUpdate: number;
  fundingRate?: number; // Current funding rate (e.g., 0.0001 = 0.01%)
  nextFundingTime?: number; // Unix timestamp
}

export type PriceMap = Record<string, PriceData>;

// Map our symbols to Binance symbols
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  ZEC: "ZECUSDT",
};

const SUPPORTED_SYMBOLS = ["BTC", "ETH", "SOL", "ZEC"];

export function useLivePrices() {
  const [prices, setPrices] = useState<PriceMap>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Binance WebSocket for real-time prices
    const streams = SUPPORTED_SYMBOLS.map(s => `${SYMBOL_MAP[s].toLowerCase()}@ticker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

    ws.onopen = () => {
      setIsConnected(true);
      console.log("Price feed connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Find which symbol this is for
        const binanceSymbol = data.s;
        const ourSymbol = Object.entries(SYMBOL_MAP).find(([_, v]) => v === binanceSymbol)?.[0];
        
        if (ourSymbol) {
          const newPrice = parseFloat(data.c); // Current price
          const change24h = parseFloat(data.p); // Price change
          const changePercent24h = parseFloat(data.P); // Price change percent

          setPrices(prev => {
            const prevData = prev[ourSymbol];
            return {
              ...prev,
              [ourSymbol]: {
                symbol: ourSymbol,
                price: newPrice,
                prevPrice: prevData?.price || newPrice,
                change24h,
                changePercent24h,
                lastUpdate: Date.now(),
              },
            };
          });
        }
      } catch (e) {
        console.error("Failed to parse price data", e);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, []);

  // Fetch funding rates from Binance Futures
  const fetchFundingRates = useCallback(async () => {
    try {
      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT`
      );
      const btcData = await response.json();
      
      // Fetch for other symbols too
      const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
      const fundingData: Record<string, { rate: number; time: number }> = {};
      
      for (const sym of symbols) {
        try {
          const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`);
          const data = await res.json();
          const ourSymbol = sym.replace("USDT", "");
          fundingData[ourSymbol] = {
            rate: parseFloat(data.lastFundingRate),
            time: data.nextFundingTime,
          };
        } catch (e) {
          // Skip if individual fetch fails
        }
      }

      // Update prices with funding data
      setPrices(prev => {
        const updated = { ...prev };
        for (const [symbol, funding] of Object.entries(fundingData)) {
          if (updated[symbol]) {
            updated[symbol] = {
              ...updated[symbol],
              fundingRate: funding.rate,
              nextFundingTime: funding.time,
            };
          }
        }
        return updated;
      });
    } catch (e) {
      console.error("Failed to fetch funding rates", e);
    }
  }, []);

  // Initial fetch via REST to get prices immediately
  const fetchInitialPrices = useCallback(async () => {
    try {
      const symbols = SUPPORTED_SYMBOLS.map(s => SYMBOL_MAP[s]);
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`
      );
      const data = await response.json();

      const initialPrices: PriceMap = {};
      for (const item of data) {
        const ourSymbol = Object.entries(SYMBOL_MAP).find(([_, v]) => v === item.symbol)?.[0];
        if (ourSymbol) {
          const price = parseFloat(item.lastPrice);
          initialPrices[ourSymbol] = {
            symbol: ourSymbol,
            price,
            prevPrice: price,
            change24h: parseFloat(item.priceChange),
            changePercent24h: parseFloat(item.priceChangePercent),
            lastUpdate: Date.now(),
          };
        }
      }
      setPrices(initialPrices);
      
      // Also fetch funding rates
      fetchFundingRates();
    } catch (e) {
      console.error("Failed to fetch initial prices", e);
      // Fallback prices if API fails
      const fallback: PriceMap = {
        BTC: { symbol: "BTC", price: 97500, prevPrice: 97500, change24h: 0, changePercent24h: 0, lastUpdate: Date.now(), fundingRate: 0.0001 },
        ETH: { symbol: "ETH", price: 3650, prevPrice: 3650, change24h: 0, changePercent24h: 0, lastUpdate: Date.now(), fundingRate: 0.0001 },
        SOL: { symbol: "SOL", price: 235, prevPrice: 235, change24h: 0, changePercent24h: 0, lastUpdate: Date.now(), fundingRate: 0.0001 },
        ZEC: { symbol: "ZEC", price: 67, prevPrice: 67, change24h: 0, changePercent24h: 0, lastUpdate: Date.now(), fundingRate: 0.0001 },
      };
      setPrices(fallback);
    }
  }, [fetchFundingRates]);

  useEffect(() => {
    fetchInitialPrices();
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, fetchInitialPrices]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  return { prices, getPrice, isConnected };
}

// Helper to format price with appropriate decimals
export function formatLivePrice(price: number): string {
  if (price >= 10000) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 100) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
}

