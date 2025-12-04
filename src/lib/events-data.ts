// Mock data for Polymarket/Kalshi style prediction markets

export interface EventMarket {
  id: string;
  platform: "polymarket" | "kalshi";
  category: "sports" | "politics" | "crypto" | "entertainment" | "economics";
  title: string;
  description: string;
  endDate: string;
  yesPrice: number; // 0-1, represents probability/price
  noPrice: number;
  volume24h: string;
  totalVolume: string;
  icon?: string;
}

export interface EventPosition {
  id: string;
  market: EventMarket;
  side: "yes" | "no";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
}

export interface ParsedEventCommand {
  type: "event_bet" | "multi_bet" | "unknown";
  markets?: EventMarket[];
  side?: "yes" | "no";
  amount?: number;
  error?: string;
}

// Today's featured markets
export const featuredMarkets: EventMarket[] = [
  // Sports - NBA
  {
    id: "lakers-celtics-dec4",
    platform: "polymarket",
    category: "sports",
    title: "Lakers beat Celtics tonight?",
    description: "Will the Los Angeles Lakers defeat the Boston Celtics on December 4th, 2024?",
    endDate: new Date(Date.now() + 8 * 3600000).toISOString(),
    yesPrice: 0.42,
    noPrice: 0.58,
    volume24h: "$1.2M",
    totalVolume: "$4.8M",
    icon: "🏀",
  },
  {
    id: "lebron-30pts-dec4",
    platform: "polymarket",
    category: "sports",
    title: "LeBron scores 30+ points tonight?",
    description: "Will LeBron James score 30 or more points against the Celtics on December 4th?",
    endDate: new Date(Date.now() + 8 * 3600000).toISOString(),
    yesPrice: 0.38,
    noPrice: 0.62,
    volume24h: "$890K",
    totalVolume: "$2.1M",
    icon: "🏀",
  },
  {
    id: "lebron-triple-double-dec4",
    platform: "polymarket",
    category: "sports",
    title: "LeBron triple-double tonight?",
    description: "Will LeBron James record a triple-double against the Celtics?",
    endDate: new Date(Date.now() + 8 * 3600000).toISOString(),
    yesPrice: 0.22,
    noPrice: 0.78,
    volume24h: "$340K",
    totalVolume: "$1.1M",
    icon: "🏀",
  },
  // Sports - NFL
  {
    id: "chiefs-bills-dec8",
    platform: "polymarket",
    category: "sports",
    title: "Chiefs beat Bills this Sunday?",
    description: "Will the Kansas City Chiefs defeat the Buffalo Bills on December 8th?",
    endDate: new Date(Date.now() + 4 * 24 * 3600000).toISOString(),
    yesPrice: 0.52,
    noPrice: 0.48,
    volume24h: "$2.4M",
    totalVolume: "$8.2M",
    icon: "🏈",
  },
  {
    id: "mahomes-3td-dec8",
    platform: "polymarket",
    category: "sports",
    title: "Mahomes throws 3+ TDs vs Bills?",
    description: "Will Patrick Mahomes throw 3 or more touchdown passes against the Bills?",
    endDate: new Date(Date.now() + 4 * 24 * 3600000).toISOString(),
    yesPrice: 0.45,
    noPrice: 0.55,
    volume24h: "$1.1M",
    totalVolume: "$3.4M",
    icon: "🏈",
  },
  // Crypto
  {
    id: "btc-100k-dec",
    platform: "polymarket",
    category: "crypto",
    title: "Bitcoin above $100k by Dec 31?",
    description: "Will Bitcoin's price be above $100,000 at any point before December 31st, 2024?",
    endDate: "2024-12-31T23:59:59Z",
    yesPrice: 0.72,
    noPrice: 0.28,
    volume24h: "$5.2M",
    totalVolume: "$48M",
    icon: "₿",
  },
  {
    id: "eth-4k-dec",
    platform: "polymarket",
    category: "crypto",
    title: "Ethereum above $4k by year end?",
    description: "Will Ethereum's price exceed $4,000 before December 31st, 2024?",
    endDate: "2024-12-31T23:59:59Z",
    yesPrice: 0.58,
    noPrice: 0.42,
    volume24h: "$2.8M",
    totalVolume: "$22M",
    icon: "⟠",
  },
  // Politics
  {
    id: "trump-cabinet-dec",
    platform: "polymarket",
    category: "politics",
    title: "All Trump cabinet picks confirmed by Dec 31?",
    description: "Will all of Trump's cabinet nominations be confirmed by the Senate before year end?",
    endDate: "2024-12-31T23:59:59Z",
    yesPrice: 0.15,
    noPrice: 0.85,
    volume24h: "$1.8M",
    totalVolume: "$12M",
    icon: "🏛️",
  },
  {
    id: "fed-rate-dec",
    platform: "kalshi",
    category: "economics",
    title: "Fed cuts rates in December?",
    description: "Will the Federal Reserve cut interest rates at the December 2024 FOMC meeting?",
    endDate: "2024-12-18T19:00:00Z",
    yesPrice: 0.78,
    noPrice: 0.22,
    volume24h: "$3.1M",
    totalVolume: "$15M",
    icon: "📊",
  },
];

// Player/team aliases for parsing
export const SPORTS_ALIASES: Record<string, string[]> = {
  // NBA Teams
  "lakers": ["lakers", "lal", "los angeles lakers", "lake show"],
  "celtics": ["celtics", "bos", "boston celtics", "boston"],
  "warriors": ["warriors", "gsw", "golden state", "dubs"],
  "heat": ["heat", "mia", "miami heat", "miami"],
  
  // NBA Players
  "lebron": ["lebron", "lebron james", "bron", "king james", "the king"],
  "curry": ["curry", "steph", "steph curry", "stephen curry", "chef curry"],
  "tatum": ["tatum", "jayson tatum", "jt"],
  "ad": ["ad", "anthony davis", "davis"],
  
  // NFL Teams
  "chiefs": ["chiefs", "kc", "kansas city", "kansas city chiefs"],
  "bills": ["bills", "buf", "buffalo", "buffalo bills"],
  "eagles": ["eagles", "phi", "philly", "philadelphia eagles"],
  
  // NFL Players
  "mahomes": ["mahomes", "patrick mahomes", "pm15"],
  "allen": ["allen", "josh allen", "ja17"],
  "kelce": ["kelce", "travis kelce", "trav"],
};

// Parse intent from sports-related belief
export function parseSportsBelief(input: string): {
  teams: string[];
  players: string[];
  outcomes: string[];
  markets: EventMarket[];
} {
  const normalized = input.toLowerCase();
  const teams: string[] = [];
  const players: string[] = [];
  const outcomes: string[] = [];
  
  // Find teams
  for (const [team, aliases] of Object.entries(SPORTS_ALIASES)) {
    if (["lakers", "celtics", "warriors", "heat", "chiefs", "bills", "eagles"].includes(team)) {
      if (aliases.some(alias => normalized.includes(alias))) {
        teams.push(team);
      }
    }
  }
  
  // Find players
  for (const [player, aliases] of Object.entries(SPORTS_ALIASES)) {
    if (["lebron", "curry", "tatum", "ad", "mahomes", "allen", "kelce"].includes(player)) {
      if (aliases.some(alias => normalized.includes(alias))) {
        players.push(player);
      }
    }
  }
  
  // Detect outcomes
  if (normalized.includes("win") || normalized.includes("beat") || normalized.includes("defeat")) {
    outcomes.push("win");
  }
  if (normalized.includes("monster") || normalized.includes("big game") || normalized.includes("go off") || normalized.includes("30+") || normalized.includes("cook")) {
    outcomes.push("big_game");
  }
  if (normalized.includes("triple") || normalized.includes("triple-double") || normalized.includes("triple double")) {
    outcomes.push("triple_double");
  }
  if (normalized.includes("td") || normalized.includes("touchdown") || normalized.includes("3+")) {
    outcomes.push("touchdowns");
  }
  
  // Match to markets
  const matchedMarkets: EventMarket[] = [];
  
  if (teams.includes("lakers") && outcomes.includes("win")) {
    const market = featuredMarkets.find(m => m.id === "lakers-celtics-dec4");
    if (market) matchedMarkets.push(market);
  }
  
  if (players.includes("lebron")) {
    if (outcomes.includes("big_game")) {
      const market = featuredMarkets.find(m => m.id === "lebron-30pts-dec4");
      if (market) matchedMarkets.push(market);
    }
    if (outcomes.includes("triple_double")) {
      const market = featuredMarkets.find(m => m.id === "lebron-triple-double-dec4");
      if (market) matchedMarkets.push(market);
    }
  }
  
  if (teams.includes("chiefs") && outcomes.includes("win")) {
    const market = featuredMarkets.find(m => m.id === "chiefs-bills-dec8");
    if (market) matchedMarkets.push(market);
  }
  
  if (players.includes("mahomes") && outcomes.includes("touchdowns")) {
    const market = featuredMarkets.find(m => m.id === "mahomes-3td-dec8");
    if (market) matchedMarkets.push(market);
  }
  
  return { teams, players, outcomes, markets: matchedMarkets };
}

export function formatOdds(price: number): string {
  // Convert probability to American odds
  if (price >= 0.5) {
    const odds = -Math.round((price / (1 - price)) * 100);
    return odds.toString();
  } else {
    const odds = Math.round(((1 - price) / price) * 100);
    return `+${odds}`;
  }
}

export function formatProbability(price: number): string {
  return `${Math.round(price * 100)}%`;
}

export function calculatePayout(amount: number, price: number): number {
  return amount / price;
}

export const initialEventPositions: EventPosition[] = [
  {
    id: "epos-1",
    market: featuredMarkets.find(m => m.id === "btc-100k-dec")!,
    side: "yes",
    shares: 500,
    avgPrice: 0.65,
    currentPrice: 0.72,
    pnl: 35,
    pnlPercent: 10.77,
    openedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];
