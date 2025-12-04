# Belief Router — Product Spec v1

> The fastest way to express and manage crypto trades.  
> One interface. Any thesis. Instant execution.

---

## The Vision

**The problem:** Going from "I have a market view" to "I'm in a well-structured position" takes too long and too many clicks. Even on good platforms like Hyperliquid, it's: click market → set size → set leverage → set TP → set SL → confirm. That's 30+ seconds and 10+ clicks per trade.

**The solution:** A keyboard-first trading interface where you type your thesis in natural language and execute in <2 seconds. Power tool for serious traders, not a game for casuals.

**The insight:** Speed and structure matter more than discovery for crypto. Traders already know what they want to trade — they need a faster way to express it and better tools to structure it.

---

## Target User

**Primary:** Active crypto perp traders
- Trade 5-50x per day
- Trade $5k-$100k+ daily volume
- Already use Hyperliquid, Drift, or CEX perps
- Sophisticated enough to want leverage, but annoyed by clunky UIs
- Value speed and keyboard shortcuts

**Secondary:** Crypto-curious with conviction
- Have views from Twitter/research
- Want to express them easily
- Would trade more if friction was lower

**Not for:** Complete beginners, spot-only holders, people who need hand-holding

---

## Core Principles

1. **Speed over everything** — Every interaction should be faster than alternatives
2. **Keyboard-first** — Power users don't click, they type
3. **Smart defaults, full control** — Works with zero config, but everything is adjustable
4. **Show the work** — Transparent execution, no black boxes
5. **Professional, not playful** — Tool aesthetic, not game aesthetic

---

## Feature Tiers

### Tier 1: Core Velocity (Week 1-2)
*Ship this first. This is the product.*

#### 1.1 Keyboard Command Interface
```
Cmd+K opens command bar
Type: "sol long 10k 2x 24h"
Enter: Executes immediately

Syntax:
  [asset] [direction] [size] [leverage] [timeframe]
  
Examples:
  "sol long 10k"           → SOL long, $10k, default leverage
  "eth short 5k 3x"        → ETH short, $5k, 3x leverage  
  "btc long 50k 2x 1w"     → BTC long, $50k, 2x, 1 week window
  "close sol"              → Close SOL position
  "flip eth"               → Flip ETH position (close + reverse)
```

#### 1.2 Quick Execution Panel
For those who want a UI, but still fast:
- Click asset from watchlist
- Size slider (preset amounts: $1k, $5k, $10k, $25k, $50k)
- Leverage toggle (1x, 2x, 3x, 5x)
- Big Long/Short buttons
- Optional TP/SL (collapsed by default, smart defaults if expanded)

#### 1.3 Position Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio                                            PnL: +$2,847│
│ Net Exposure: $45,000 (73% long)                     Today: +$1,204│
├─────────────────────────────────────────────────────────────────┤
│ SOL   Long   $20,000  2x   +$1,200 (+6.0%)   [+] [-] [Flip] [X] │
│ ETH   Short  $10,000  2x   +$800 (+8.0%)     [+] [-] [Flip] [X] │
│ ARB   Long   $15,000  1.5x -$153 (-1.0%)     [+] [-] [Flip] [X] │
└─────────────────────────────────────────────────────────────────┘

[+] = Add to position
[-] = Reduce position  
[Flip] = Close and open opposite
[X] = Close entirely
```

#### 1.4 Quick Actions
- **Flip:** Close position → Open opposite in one click
- **Double down:** Add 100% to position
- **Half:** Close 50% of position
- **Close all:** Emergency close everything

---

### Tier 2: Strategy Enablers (Week 3-4)
*Things traders want to do but don't because they're annoying.*

#### 2.1 Pair Trades
```
Command: "sol vs eth 10k"
         "long sol short eth 10k each"

Creates:
- SOL Long $10k
- ETH Short $10k
- Managed as single "position"
- Shows combined PnL
- Closes together
```

Why it matters: Pair trades are better risk-adjusted trades. Nobody does them because managing two positions is annoying. Make it one thing.

#### 2.2 Baskets
```
Command: "solana ecosystem 20k"

Creates weighted basket:
- SOL 50% ($10k)
- JUP 20% ($4k)
- PYTH 15% ($3k)
- JTO 15% ($3k)

Preset baskets:
- Solana ecosystem
- AI tokens (FET, RENDER, TAO, AKT)
- L2s (ARB, OP, STRK)
- Memecoins (WIF, BONK, PEPE)
- DeFi blue chips (UNI, AAVE, MKR)
```

#### 2.3 Scale In/Out
```
Commands:
"add 5k to sol"      → Increases SOL position by $5k
"reduce eth 50%"     → Closes half of ETH position
"move sol to 3x"     → Adjusts leverage on existing position
```

#### 2.4 Mobile App with Alerts
Push notification:
```
┌─────────────────────────────────┐
│ 🔥 SOL +5% in last hour        │
│ Momentum continuing             │
│                                 │
│ [Long $5k]  [Long $10k]  [Skip] │
└─────────────────────────────────┘
```

One tap → Position open. From notification to filled in <3 seconds.

---

### Tier 3: Engagement & Growth (Month 2)
*What keeps them coming back and brings new users.*

#### 3.1 "What's Moving" Feed
```
🔥 Hot right now:
   WIF   +12% (1h)  Vol: $45M   [Long] [Short]
   PEPE  +8%  (1h)  Vol: $32M   [Long] [Short]
   SOL   +5%  (1h)  Vol: $120M  [Long] [Short]

📉 Dropping:
   ARB   -6%  (1h)  Vol: $18M   [Long] [Short]
   OP    -4%  (1h)  Vol: $12M   [Long] [Short]
```

Not predictions. Just "here's what's happening" with one-click actions.

#### 3.2 Trade Analytics
```
Your last 30 days:
├─ 142 trades
├─ 58% win rate  
├─ +$12,847 net PnL
├─ Avg winner: +$284
├─ Avg loser: -$156
├─ Best asset: SOL (72% win rate)
├─ Worst asset: ARB (38% win rate)
└─ Insight: You exit winners 2.3x faster than losers. 
            Consider letting winners run longer.
```

#### 3.3 Conditional Orders
```
Command: "if btc > 100k then long sol 10k 3x"

Sets up:
- Trigger: BTC crosses $100,000
- Action: Open SOL Long, $10k, 3x leverage
- Notification when triggered
```

---

### Tier 4: Viral Growth (Month 3+)
*The multiplier.*

#### 4.1 Trade Sharing
After any trade, generate shareable card:
```
┌─────────────────────────────────┐
│ 🟢 SOL Long                     │
│ +$1,847 (+18.4%)               │
│ 2x leverage · 6 hours          │
│                                 │
│ beliefrouter.xyz               │
└─────────────────────────────────┘
```

Optimized for Twitter/Discord embeds.

#### 4.2 Copy Trading
```
Follow top traders:
┌─────────────────────────────────────────────────┐
│ 🏆 Top Traders (7d)                             │
│                                                 │
│ 1. @trader_x    +$48,291  (84% win)  [Follow]  │
│ 2. @sol_maxi    +$31,847  (71% win)  [Follow]  │
│ 3. @perp_god    +$28,104  (69% win)  [Follow]  │
└─────────────────────────────────────────────────┘

When following:
"@trader_x opened SOL Long 2x"
[Copy 1x] [Copy 2x] [Skip]
```

#### 4.3 Leaderboards
- Daily/weekly/monthly top PnL
- Best win rate (min 20 trades)
- Best by asset
- Optional: tie to on-chain identity

---

## Technical Architecture

### Execution Layer
```
User Input
    ↓
Command Parser (local, instant)
    ↓
Trade Intent Object
    ↓
Route to Venue:
├─ Hyperliquid (primary)
├─ Drift (backup/comparison)
└─ Jupiter Perps (if better price)
    ↓
Execution via user's wallet (non-custodial)
    ↓
Position tracked locally + on-chain
```

### Non-Custodial
- User connects wallet (Phantom, Rabby, etc.)
- Signs each transaction
- We never hold funds
- We're a UI layer, not a custodian

### Data Flow
- Price feeds: WebSocket from venues
- Position data: On-chain + local cache
- Analytics: Local storage + optional cloud sync

---

## Business Model

### Revenue Streams

**1. Trading Fees (Primary)**
- Take 0.01-0.05% of volume routed through us
- Or: referral revenue from venues (HL has referral program)

**2. Premium Subscription ($20-50/mo)**
- Conditional orders
- Advanced analytics
- Priority execution
- More basket presets
- API access

**3. Copy Trading Fees (Later)**
- Leaders earn % of follower profits
- Platform takes cut of leader earnings

### Unit Economics Target
```
1,000 DAU × $5,000 avg volume × 0.05% = $2,500/day = $75k/month
5,000 DAU × $10,000 avg volume × 0.05% = $25,000/day = $750k/month
```

---

## Success Metrics

### North Star
**Daily trading volume through the platform**

### Leading Indicators
- DAU (daily active users)
- Trades per user per day
- Volume per user per day
- Retention (D1, D7, D30)
- Command bar usage % (are people using keyboard?)

### Health Metrics
- Execution speed (time from intent to fill)
- Execution quality (slippage vs. direct)
- Error rate
- Uptime

---

## Launch Plan

### Phase 1: Private Alpha (Week 1-2)
- Core keyboard execution
- Basic position dashboard
- Invite 50-100 trusted traders
- Daily feedback, rapid iteration

### Phase 2: Public Beta (Week 3-4)
- Pair trades, baskets
- Mobile alerts
- Open to waitlist (1,000 users)
- Soft launch tweet, not big announcement

### Phase 3: Public Launch (Month 2)
- Analytics, conditional orders
- Big launch thread
- Influencer seeding
- Target: 5,000 DAU

### Phase 4: Growth (Month 3+)
- Copy trading
- Leaderboards
- Referral program
- Target: 20,000 DAU

---

## What We're NOT Building (V1)

- ❌ Stock trading (no LLY, NVDA — crypto only for now)
- ❌ Options (perps only)
- ❌ Spot trading (perps only, for leverage)
- ❌ Portfolio tracking for external wallets
- ❌ News/research/content
- ❌ Social features beyond sharing
- ❌ Gamification (streaks, badges, etc.)
- ❌ Onboarding tutorials (users should be sophisticated)

---

## Open Questions

1. **Fee structure:** Take our own fee vs. rely on venue referral revenue?
2. **Multi-venue:** Start with HL only, or HL + Drift from day 1?
3. **Mobile:** React Native, or web-first with PWA?
4. **Identity:** Wallet-only, or optional email/social login?
5. **Copy trading structure:** How to handle regulatory concerns?

---

## The Pitch (One-Liner)

**For investors:**
> "Keyboard-first trading interface for crypto perps. Bloomberg speed meets Perplexity intelligence. Built by [400k follower trader] and [Phantom acqui-hire engineer]."

**For users:**  
> "Trade in 2 seconds, not 20. Cmd+K → 'sol long 10k 2x' → Enter → Done."

**For ourselves:**
> "The tool we wish existed. Fast, powerful, no bullshit."

---

*Last updated: December 2024*
*Version: 1.0*
