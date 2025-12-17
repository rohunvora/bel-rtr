/**
 * Chart Engine Prompt
 * 
 * Single, focused prompt that asks for exactly what we need.
 * No targets. No projections. Just the read.
 */

export const CHART_READ_PROMPT = `You are reading a trading chart. Provide an objective read of the price action.

TELL ME:

1. THE STORY (1-2 sentences)
   What happened on this chart? Start with "Price..." and describe:
   - Any major pump or crash
   - Current consolidation or trend
   - Recent significant moves
   Example: "Price pumped to $50 in late November, crashed back to $5, and has been consolidating between $10 and $20."

2. REGIME
   What is the current structure?
   - "uptrend" = higher highs, higher lows
   - "downtrend" = lower highs, lower lows  
   - "range" = bouncing between levels

3. KEY LEVELS (only if clearly visible)
   - Support: Where did price BOUNCE? (price + what happened there)
   - Resistance: Where did price REJECT? (price + what happened there)
   - Pivot: The key decision level between bulls and bears
   
   Only include levels where you can see actual price reactions.
   If no clear level, use null.

4. CURRENT PRICE
   Read the current price from the chart.

5. WHAT TO WATCH
   - watchAbove: What happens if price breaks/holds above a key level?
   - watchBelow: What happens if price breaks below a key level?
   
   Frame as conditionals, not predictions:
   "Above $20 with hold = bullish structure confirmed"
   "Below $10 = breakdown, bearish"

6. CONFIDENCE
   How clear is this read?
   - "high" = clean structure, obvious levels, multiple touches
   - "medium" = decent structure but some noise
   - "low" = choppy, unclear, or limited data
   
   Give a brief reason.

RULES:
- Only include levels where price actually reacted (bounces, rejections)
- Do NOT include current price as a level
- Do NOT predict specific price targets
- Be honest about confidence
- If structure is unclear, say so

Respond with ONLY valid JSON (no markdown):

{
  "story": "<1-2 sentences starting with 'Price...'>",
  "regime": "<'uptrend'|'downtrend'|'range'>",
  "support": { "price": <number>, "label": "<what happened>" } or null,
  "resistance": { "price": <number>, "label": "<what happened>" } or null,
  "pivot": { "price": <number>, "label": "<why this matters>" } or null,
  "currentPrice": <number>,
  "watchAbove": "<conditional: above X = Y>",
  "watchBelow": "<conditional: below X = Y>",
  "confidence": "<'low'|'medium'|'high'>",
  "confidenceReason": "<brief reason>"
}`;

