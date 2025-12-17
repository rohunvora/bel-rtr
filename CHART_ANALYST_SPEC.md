# Chart Analyst — Focused Product Spec

> **The honest pitch:** A chart analysis agent that does things a generic chat UI can't do reliably — verified levels from data, consistent output structure, real risk framing, and continuity over time.

---

## The Repositioning

**Current state:** Belief Router is a multi-asset "type your view" trading interface. Chart analysis is one feature among many.

**Proposed state:** Strip it down. Make chart analysis the entire product. Go deep on the 9 differentiators that actually matter.

**Why this makes sense:**
- Chat apps (ChatGPT, Claude, Gemini) can already do "paste screenshot → get analysis"
- We can't out-ChatGPT ChatGPT
- We CAN build a specialized tool with data verification, state persistence, and structured output that chat apps don't provide

---

## The 9 Differentiators (Mapped to Features)

### 1. Verified Levels (Data-Backed) ⭐ CRITICAL

**The Problem:**
Chat apps "eyeball" levels from pixels. They can't verify touches, misread axes, and hallucinate prices.

**Our Solution:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Screenshot (user uploads)     │    OHLCV Data (we fetch)       │
│  ───────────────────────────   │    ────────────────────────    │
│  • Used for RENDERING only     │    • Source of NUMERIC TRUTH   │
│  • Context for the user        │    • Compute S/R from touches  │
│  • Pattern shape reference     │    • Verify axis labels        │
│                                │    • Calculate exact distances │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
interface VerifiedLevel {
  price: number;
  type: "support" | "resistance";
  touchCount: number;           // Verified from data
  lastTested: string;           // "2h ago", "3 days ago"
  strength: "weak" | "moderate" | "strong";
  priceZone: { low: number; high: number };  // Not a single line
  dataSource: "ohlcv" | "image_only";        // Transparency
}
```

**Data Sources (in order of preference):**
1. **CoinGecko / CoinMarketCap API** — Free, covers most crypto
2. **Binance/Bybit WebSocket** — Real-time, requires key
3. **TradingView Widget Data** — If user pastes TV link
4. **Fallback: Image-only** — Mark as `dataSource: "image_only"` with lower confidence

**UI Treatment:**

```
┌─────────────────────────────────────────────────────────────┐
│  Support: $94,200 - $94,800                                │
│  ───────────────────────────────                            │
│  ✓ 4 verified touches                                       │
│  ✓ Last tested: 6 hours ago                                │
│  ✓ Strength: Strong                                         │
│                                                             │
│  [View touch points →]  [Set alert at $94,500]             │
└─────────────────────────────────────────────────────────────┘
```

vs. image-only fallback:

```
┌─────────────────────────────────────────────────────────────┐
│  Support: ~$94,500 ⚠️                                       │
│  ───────────────────────────────                            │
│  ⚠ Estimated from image (no data link)                     │
│  ⚠ Lower confidence                                        │
│                                                             │
│  [Link price data to verify →]                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Consistent House Style (No Spaghetti)

**The Problem:**
Chat apps vary wildly. Sometimes clean, sometimes 15 overlapping lines.

**Our Solution:**

```typescript
// Fixed output structure - ALWAYS the same
interface ChartReadout {
  // SECTION 1: Regime (1 item)
  regime: {
    trend: "uptrend" | "downtrend" | "range" | "breakout";
    strength: "weak" | "moderate" | "strong";
    description: string;  // Max 15 words
  };
  
  // SECTION 2: Key Levels (max 3)
  keyLevels: VerifiedLevel[];  // Hard cap at 3
  
  // SECTION 3: Pivot (1 item)
  pivot: {
    price: number;
    significance: string;  // Max 20 words
  };
  
  // SECTION 4: Scenarios (exactly 2)
  scenarios: {
    bullish: Scenario;
    bearish: Scenario;
  };
  
  // SECTION 5: Invalidation (1 item)
  invalidation: {
    price: number;
    meaning: string;
  };
}

// Annotation budget: 6 objects max
// - 3 horizontal levels
// - 1 pivot zone
// - 2 scenario arrows (optional)
```

**UI: Simple Mode (default)**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 REGIME                                                  │
│  Range-bound, moderate volatility                          │
│                                                             │
│  📍 KEY LEVELS                                              │
│  R1: $98,500 (strong)                                      │
│  Pivot: $96,200                                            │
│  S1: $94,200 (strong)                                      │
│                                                             │
│  🎯 IF BREAKS UP                                            │
│  → Target $102,000 (prior swing high)                      │
│  → Confirmation: Close above $98,500 with volume           │
│                                                             │
│  📉 IF BREAKS DOWN                                          │
│  → Target $91,500 (200 EMA)                                │
│  → Confirmation: Close below $94,000 on volume             │
│                                                             │
│  ⛔ INVALIDATION                                            │
│  Chop continues if price stays $94,200-$98,500             │
│                                                             │
│  [Copy levels] [Set alerts] [Expand details ↓]             │
└─────────────────────────────────────────────────────────────┘
```

**Annotation Rules:**
- Max 6 visual elements on any chart
- Consistent colors: Green = support/bullish, Red = resistance/bearish, Blue = pivot/neutral
- Thin lines (2px), minimal labels
- No pattern drawings by default (optional in expanded mode)

---

### 3. Decision Card with Risk Framing

**The Problem:**
Chat apps give commentary, not actionable rules. No invalidation, no confirmation criteria.

**Our Solution:**

```typescript
interface DecisionCard {
  // Required on every analysis
  invalidation: {
    condition: string;     // "Price closes above $98,500"
    meaning: string;       // "Bearish thesis invalid"
    action: string;        // "Close short, consider flip"
  };
  
  confirmation: {
    bullish: string;       // "4H close above pivot with >avg volume"
    bearish: string;       // "Rejection at R1 with rising sell volume"
  };
  
  ifWrong: {
    bullish: string;       // "If long and price loses S1, exit at $94,000"
    bearish: string;       // "If short and price reclaims pivot, exit at $96,500"
  };
  
  // Optional: Position sizing (if user provides account size)
  sizing?: {
    accountSize: number;
    maxRiskPercent: number;
    suggestedSize: number;
    rMultiple: number;
  };
}
```

**UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 DECISION RULES                                          │
│                                                             │
│  ✓ BULLISH CONFIRMATION                                     │
│  4H close above $96,200 with volume > 20-period avg        │
│                                                             │
│  ✓ BEARISH CONFIRMATION                                     │
│  Rejection at $98,500 with rising sell volume              │
│                                                             │
│  ⛔ BULLISH INVALID IF:                                     │
│  Price closes below $94,000 → Next support $91,500         │
│                                                             │
│  ⛔ BEARISH INVALID IF:                                     │
│  Price closes above $98,500 → Next resistance $102,000     │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  💰 POSITION SIZING (optional)                              │
│  Account: $10,000 · Max risk: 2%                           │
│  Entry: $96,200 · Stop: $94,000 (2.3%)                     │
│  Size: $8,700 notional · R-multiple: 2.6 to TP1            │
│                                                             │
│  [Copy trade params] [Skip sizing]                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Multi-Timeframe Context (Automatic)

**The Problem:**
Users show one timeframe, get tunnel vision. Chat apps don't ask for context.

**Our Solution:**

If user provides 4H chart of BTC, we automatically:
1. Fetch Daily data → identify major trend
2. Use 4H for tactical structure
3. Reference 1H for entry timing

```typescript
interface MultiTimeframeAnalysis {
  major: {
    timeframe: "1D" | "1W";
    trend: "up" | "down" | "range";
    keyLevel: number;
    significance: string;
  };
  
  tactical: {
    timeframe: "4H" | "1D";
    structure: string;
    pivot: number;
    keyLevels: number[];
  };
  
  trigger: {
    timeframe: "1H" | "4H";
    entrySignal: string;
    invalidation: number;
  };
}
```

**UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  🔭 MULTI-TIMEFRAME VIEW                                    │
│                                                             │
│  MAJOR (Daily)                                              │
│  ─────────────                                              │
│  Trend: Uptrend (higher highs since Oct)                   │
│  Key level: $91,500 (must hold for trend intact)           │
│                                                             │
│  TACTICAL (4H) — Your chart                                 │
│  ────────────                                               │
│  Structure: Range $94,200 - $98,500                        │
│  Pivot: $96,200 (mid-range, EMA confluence)                │
│                                                             │
│  TRIGGER (1H)                                               │
│  ───────────                                                │
│  Entry signal: Break and retest of $96,200                 │
│  Invalidation: 1H close back below $95,800                 │
│                                                             │
│  💡 SUMMARY                                                 │
│  Major trend bullish, tactically ranging. Look for         │
│  trigger confirmations before entry.                       │
└─────────────────────────────────────────────────────────────┘
```

**Data Requirement:**
We need to fetch additional timeframe data. This is where the CoinGecko/exchange API integration pays off.

---

### 5. "What Changed?" Tracking (State Persistence)

**The Problem:**
Chat apps reset every conversation. No memory of yesterday's analysis.

**Our Solution:**

```typescript
interface AssetLevelMap {
  symbol: string;
  levels: VerifiedLevel[];
  lastUpdated: string;
  history: LevelChange[];  // Track changes over time
}

interface LevelChange {
  timestamp: string;
  type: "added" | "removed" | "tested" | "broken" | "shifted";
  level: VerifiedLevel;
  note: string;
}
```

**Storage:**
- LocalStorage for v1 (browser-based)
- Cloud sync for v2 (user accounts)

**UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  🔄 WHAT CHANGED (since last analysis)                      │
│                                                             │
│  BTC/USD — Last analyzed 18h ago                           │
│                                                             │
│  ✅ LEVEL BROKEN                                            │
│  $96,200 resistance → Now acting as support                │
│  (Role reversal confirmed, 2 retests)                      │
│                                                             │
│  📈 LEVEL SHIFTED                                           │
│  Support moved up: $94,200 → $95,500 (+1.4%)              │
│                                                             │
│  ⚡ NEW DEVELOPMENT                                         │
│  New resistance forming at $99,200                         │
│  (3 rejections in last 12h)                                │
│                                                             │
│  [View full history →]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Alerts and Automation

**The Problem:**
Chat apps tell you levels, then you have to manually set alerts elsewhere.

**Our Solution (v1 — Browser-based):**

```typescript
interface PriceAlert {
  id: string;
  symbol: string;
  condition: "above" | "below" | "touches" | "breaks_and_retests";
  price: number;
  source: "support" | "resistance" | "pivot" | "custom";
  note: string;
  createdAt: string;
  status: "active" | "triggered" | "expired";
}

// Simple polling approach for v1
function checkAlerts(currentPrice: number, alerts: PriceAlert[]) {
  for (const alert of alerts) {
    if (alert.condition === "below" && currentPrice < alert.price) {
      triggerNotification(alert);
    }
    // etc.
  }
}
```

**v1 Constraints:**
- Browser notifications (requires tab open)
- WebSocket price feed for real-time
- Limited to ~10 active alerts

**v2 Roadmap:**
- Push notifications (mobile PWA)
- Telegram/Discord bot integration
- Server-side monitoring (always-on)

**UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  🔔 ALERTS                                                  │
│                                                             │
│  From this analysis:                                        │
│  □ Alert if BTC touches Support ($94,200)                  │
│  □ Alert if BTC closes above Resistance ($98,500)          │
│  □ Alert if BTC breaks and retests Pivot ($96,200)         │
│                                                             │
│  [Enable selected] [Manage all alerts →]                   │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  Active alerts: 3/10                                        │
│  • SOL: Above $200 (since 2d ago)                          │
│  • ETH: Below $3,400 (since 5h ago)                        │
│  • BTC: Pivot retest (since 1h ago)                        │
└─────────────────────────────────────────────────────────────┘
```

**Watchlist Scan (v2):**

```
┌─────────────────────────────────────────────────────────────┐
│  📋 WATCHLIST SCAN                                          │
│                                                             │
│  "Show charts nearest to breakout"                         │
│                                                             │
│  1. SOL/USD — 2.1% from resistance                         │
│     R: $205 · Current: $200.70                             │
│     [Analyze →]                                            │
│                                                             │
│  2. LINK/USD — 3.4% from support                           │
│     S: $14.20 · Current: $14.68                            │
│     [Analyze →]                                            │
│                                                             │
│  3. AVAX/USD — At pivot zone                               │
│     Pivot: $38-40 · Current: $39.20                        │
│     [Analyze →]                                            │
└─────────────────────────────────────────────────────────────┘
```

---

### 7. Built-in QA (Reduce Hallucinations)

**The Problem:**
Even good models state things too confidently. Wrong prices, overfit patterns.

**Our Solution:**

```typescript
interface QAChecks {
  // Run before output
  priceValidation: boolean;     // Did we label a price not on the chart?
  annotationBudget: boolean;    // Did we exceed 6 objects?
  trendlinePoints: number;      // <3 points = "candidate", not "confirmed"
  touchCount: number;           // <2 touches = "potential", not "support"
  timesinceTest: number;        // >7 days = "historical", not "active"
}

interface ConfidenceMetrics {
  overall: "low" | "medium" | "high";
  factors: {
    touchCount: number;
    timeSinceLastTest: string;
    volatilityRegime: "low" | "normal" | "high";
    rangeClean: boolean;        // Is this a clean range or choppy?
    dataQuality: "verified" | "image_only";
  };
}
```

**UI Treatment:**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 ANALYSIS CONFIDENCE                                     │
│                                                             │
│  Overall: MEDIUM ●●●○○                                      │
│                                                             │
│  ✅ Levels verified from price data                         │
│  ✅ Support has 4 touches (strong)                          │
│  ⚠️ Resistance only 2 touches (moderate)                   │
│  ⚠️ Last test >24h ago (may be stale)                      │
│  ✅ Range is clean (not choppy)                             │
│                                                             │
│  💡 This is a WAIT setup, not a NOW setup.                 │
│  Confidence increases with fresh retest.                   │
└─────────────────────────────────────────────────────────────┘
```

**Auto-Downgrades:**
- Trendline from 2 points → "Candidate trendline"
- Level with 1 touch → "Potential support/resistance"
- Image-only analysis → Add disclaimer
- High volatility → Widen zones, reduce confidence

---

### 8. Adaptive Education (Progressive Disclosure)

**The Problem:**
Novices get overwhelmed by TA jargon. Experts find simple explanations annoying.

**Our Solution:**

```typescript
interface UserPreferences {
  mode: "simple" | "detailed";
  learnedConcepts: string[];   // Track what user has seen explanations for
  showExplanations: boolean;
}

interface ExpandableExplanation {
  term: string;           // "Support level"
  shortDef: string;       // "Price floor where buyers step in"
  fullExplanation: string;
  commonMistakes: string[];
  relatedTerms: string[];
}
```

**UI: Simple Mode (default)**

All jargon has inline tap-to-expand:

```
┌─────────────────────────────────────────────────────────────┐
│  Support: $94,200 [?]                                       │
│                                                             │
│  [?] tapped:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SUPPORT LEVEL                                        │   │
│  │ A price where buyers tend to step in.               │   │
│  │ Think of it as a "floor" price has bounced from.    │   │
│  │                                                      │   │
│  │ On this chart: $94,200 has been tested 4 times      │   │
│  │ and held each time.                                 │   │
│  │                                                      │   │
│  │ [Don't show this again] [More about support →]      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Progressive Learning:**
- Track concepts user has expanded
- After 3+ expansions of same concept, stop showing [?]
- Offer "Graduate to detailed mode" after learning curve

**Detailed Mode:**
- No inline explanations
- More technical language allowed
- Additional metrics (volume delta, order flow hints)

---

### 9. Performance Feedback Loop (Journal + Stats)

**The Problem:**
Users analyze charts, make trades, but never review what worked.

**Our Solution:**

```typescript
interface TradeJournalEntry {
  id: string;
  symbol: string;
  
  // From analysis
  analysisId: string;
  entryLevel: number;
  stopLevel: number;
  targetLevels: number[];
  thesis: string;
  
  // User fills in after
  actualEntry: number;
  actualExit: number;
  outcome: "win" | "loss" | "breakeven" | "open";
  pnlPercent: number;
  notes: string;
  
  // Auto-tagged
  setupType: "breakout" | "reversal" | "retest" | "range_play";
  timeframe: string;
  holdTime: string;
}

interface PerformanceStats {
  totalTrades: number;
  winRate: number;
  avgWinPercent: number;
  avgLossPercent: number;
  profitFactor: number;
  
  bySetupType: Record<string, { winRate: number; avgReturn: number }>;
  byTimeframe: Record<string, { winRate: number; avgReturn: number }>;
  
  insights: string[];  // "Your breakouts perform better than reversals"
}
```

**UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  📈 TRADE JOURNAL                                           │
│                                                             │
│  BTC Short — Dec 15, 2024                                  │
│  ────────────────────────────────────────                   │
│  Entry: $98,200 · Exit: $94,500 · PnL: +3.8%              │
│  Setup: Rejection at resistance · Held: 18h               │
│                                                             │
│  ✅ What worked: Waited for confirmation                    │
│  ❌ What didn't: Exited too early (hit $93,800 after)      │
│                                                             │
│  [View original analysis →] [Edit notes]                   │
│                                                             │
│  ─────────────────────────────────────────────────          │
│  📊 YOUR STATS (last 30 days)                               │
│                                                             │
│  Win rate: 58% · Profit factor: 1.4                        │
│  Best setup: Breakouts (72% win)                           │
│  Worst setup: Reversals (41% win)                          │
│                                                             │
│  💡 INSIGHT                                                 │
│  You enter before confirmation 40% of the time.            │
│  Those trades have 35% win rate vs 67% when you wait.      │
│                                                             │
│  [View full analytics →]                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                              │
│   Screenshot  +  Symbol (auto-detect or manual)  +  Prompt     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PARALLEL FETCH                             │
│   ┌─────────────────┐     ┌─────────────────┐                  │
│   │  Gemini Vision  │     │  Price API      │                  │
│   │  (pattern read) │     │  (OHLCV data)   │                  │
│   └────────┬────────┘     └────────┬────────┘                  │
│            │                       │                            │
│            ▼                       ▼                            │
│   ┌─────────────────────────────────────────────────┐          │
│   │              LEVEL VERIFICATION                  │          │
│   │  • Cross-reference AI levels with OHLCV         │          │
│   │  • Count actual touches                         │          │
│   │  • Calculate distances                          │          │
│   │  • Flag discrepancies                           │          │
│   └─────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT GENERATION                            │
│   ┌─────────────────────────────────────────────────┐          │
│   │  Apply house style constraints:                  │          │
│   │  • Max 3 levels + 1 pivot                       │          │
│   │  • Exactly 2 scenarios                          │          │
│   │  • Required invalidation                        │          │
│   │  • Confidence scoring                           │          │
│   └─────────────────────────────────────────────────┘          │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────┐          │
│   │  QA Checks:                                      │          │
│   │  • Price within chart range?                    │          │
│   │  • Annotation budget respected?                 │          │
│   │  • Minimum touch counts met?                    │          │
│   └─────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE                                │
│   • Update level map for this symbol                           │
│   • Diff against previous analysis                             │
│   • Store for journal/tracking                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State Management

```typescript
// Core persisted state
interface ChartAnalystState {
  // Per-asset level tracking
  levelMaps: Record<string, AssetLevelMap>;
  
  // Analysis history
  analysisHistory: AnalysisRecord[];
  
  // User preferences
  preferences: UserPreferences;
  
  // Alerts
  activeAlerts: PriceAlert[];
  
  // Journal
  tradeJournal: TradeJournalEntry[];
}
```

### API Requirements

| Feature | API Needed | Free Tier? |
|---------|-----------|------------|
| Level verification | CoinGecko OHLCV | ✅ 30 calls/min |
| Real-time prices | Binance WebSocket | ✅ Free |
| Multi-timeframe | Same as above | ✅ |
| Alerts (basic) | Browser + WebSocket | ✅ |
| Alerts (push) | FCM / OneSignal | ✅ Limited |
| Symbol detection | Gemini Vision | ✅ (current) |

---

## UI Simplification

### Before (Current)
- Multi-asset trading interface
- Portfolio management
- Prediction markets
- Stock thesis
- TWAP orders
- etc.

### After (Focused)

```
┌─────────────────────────────────────────────────────────────────┐
│  CHART ANALYST                                    [?] [⚙]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │                                                      │       │
│  │     Drop a chart screenshot here                    │       │
│  │     or paste with ⌘V                                │       │
│  │                                                      │       │
│  │     [Upload image]                                  │       │
│  │                                                      │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  Recent:  [BTC 4H] [ETH 1D] [SOL 4H]                          │
│                                                                 │
│  ─────────────────────────────────────────────────────          │
│  🔔 ACTIVE ALERTS (2)                                          │
│  • BTC above $98,500 — 1.2% away                              │
│  • SOL below $190 — 4.1% away                                 │
│                                                                 │
│  ─────────────────────────────────────────────────────          │
│  📊 RECENT ANALYSES                                            │
│  • BTC/USD 4H — 2h ago [View]                                 │
│  • ETH/USD 1D — Yesterday [View]                              │
│  • SOL/USD 4H — 2 days ago [View]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## MVP Scope (v1)

**Build (4 capabilities):**
1. ✅ Verified levels with OHLCV data
2. ✅ Consistent house style output
3. ✅ Decision card with invalidation
4. ✅ Basic alerts (browser-based)

**Partial (2 capabilities):**
5. 🔶 Multi-timeframe (manual for v1, auto for v2)
6. 🔶 What changed tracking (local storage, no cloud sync)

**Defer (3 capabilities):**
7. ❌ Push notification alerts (v2)
8. ❌ Trade journal with stats (v2)
9. ❌ Watchlist scans (v2)

---

## What We Remove from Current App

- ❌ Natural language trade entry ("BTC is going to dump")
- ❌ Portfolio management panel
- ❌ Prediction markets integration
- ❌ Stock/thesis explorer
- ❌ TWAP orders
- ❌ Target price trades
- ❌ Demo positions

**Keep:**
- ✅ Chart paste/upload
- ✅ Gemini analysis
- ✅ Chart annotation
- ✅ Toast notifications
- ✅ Settings

---

## Success Metrics

**Primary:** Analysis accuracy (measured by user feedback + journal outcomes)

**Leading:**
- Analyses per user per day
- Alert-to-trigger rate (did alerts actually fire?)
- Journal entry rate (are users tracking?)
- Return visits (DAU/MAU ratio)

**Quality:**
- Level verification rate (% of analyses with OHLCV backing)
- QA pass rate (% passing all checks)
- User-reported errors (false levels, wrong prices)

---

## The Honest V1 Pitch

> "Chart analysis that's actually verifiable."
> 
> Paste a chart. Get levels backed by real price data, not guesses. Every analysis has clear invalidation rules. Track what changes over time. Set alerts without leaving the app.
>
> This isn't ChatGPT with a system prompt. It's a specialized tool for traders who want consistency and verification.

---

*Last updated: December 2024*
