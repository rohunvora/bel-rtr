# Belief Router

> Chart analysis that's actually verifiable.

Paste a chart screenshot. Get support/resistance levels backed by visual AI analysis, not guesses. Every analysis includes clear invalidation rules and decision frameworks.

This isn't ChatGPT with a system prompt—it's a specialized tool for traders who want consistency and verification.

## Features

- **Chart Analysis** — Drop a screenshot, get structured technical analysis in seconds
- **AI-Annotated Charts** — Zones automatically drawn on your chart with Gemini's image generation
- **Consistent Output** — Same structured format every time (regime, levels, scenarios, invalidation)
- **Decision Framework** — Every analysis includes entry confirmations and invalidation rules
- **Follow-up Chat** — Ask questions about the analysis with full context preserved

## How It Works

```
Upload chart → AI extracts story + levels → Zones drawn on chart → Structured output
```

The analysis always includes:
1. **Story** — What happened on this chart, told like you're explaining to a friend
2. **Regime** — Current market state (uptrend, downtrend, range, breakout, breakdown)
3. **Key Zones** — Up to 4 support/resistance levels with strength ratings
4. **Scenarios** — Bullish and bearish "if/then" conditionals
5. **Invalidation** — Clear rules for when the thesis is wrong

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **AI**: Google Gemini 2.0 Flash (analysis) + Gemini 3 Pro (image annotation)
- **Icons**: Lucide React
- **Markdown**: react-markdown for chat responses

## Getting Started

### Prerequisites

- Node.js 18+
- A Google AI API key ([get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/bel-rtr.git
cd bel-rtr

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your NEXT_PUBLIC_GOOGLE_AI_KEY to .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### Environment Variables

```bash
NEXT_PUBLIC_GOOGLE_AI_KEY=your_gemini_api_key_here
```

## Usage

1. **Paste or upload** a chart screenshot (Cmd+V or drag & drop)
2. **Wait** for analysis (typically 3-8 seconds)
3. **Review** the story, zones, and scenarios
4. **Toggle** between AI-annotated and original chart views
5. **Ask follow-ups** to dive deeper into specific aspects
6. **Copy levels** to set alerts in your trading platform

### Tips for Best Results

- Use clean chart screenshots with visible price axis
- 4H and Daily timeframes work best
- Include some recent price action context (not just a single candle)
- Crypto pairs have the best data verification support

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main entry point
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── router/           # Main router/page components
│   │   ├── RouterPage.tsx
│   │   └── modals/
│   │       └── ChartAnalystCard.tsx  # Analysis display + chat
│   ├── ChartOverlayRenderer.tsx      # Canvas fallback for annotations
│   └── Toast.tsx
└── lib/
    ├── chart-analysis.ts  # Analysis + annotation logic
    ├── gemini.ts          # Gemini API client + chat
    └── use-persisted-state.ts
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Roadmap

- [ ] OHLCV data verification via CoinGecko API
- [ ] Browser-based price alerts
- [ ] Analysis history with "what changed" tracking
- [ ] Trade journal with performance stats
- [ ] Mobile PWA with push notifications

## Related Docs

- [Product Spec](./PRODUCT_SPEC.md) — Full product vision and feature roadmap
- [Chart Analyst Spec](./CHART_ANALYST_SPEC.md) — Technical specification for chart analysis features
- [One Pager](./ONE_PAGER.md) — Executive summary

## License

Private. All rights reserved.
