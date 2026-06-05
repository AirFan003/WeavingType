# Weaving Type

Interactive generative typography sketch — letters stitched together with woven horizontal lines.

Based on the [#Genuary2024 day 20](https://genuary.art/prompts#jan20) prompt.

## Fonts

- **English / Latin** — Source Serif 4 Variable (Roman)
- **Chinese / CJK** — Noto Sans SC

Each character automatically uses the matching font. Mixed English and Chinese in one line is supported.

## Setup

Serve the folder locally:

```bash
python3 -m http.server 3000
```

Then open `http://localhost:3000`. Fonts are loaded from CDN automatically.

To use a local English font file instead, change `FONT_ENGLISH` in `sketch.js` to your font path.

## Controls

| Control | Effect |
| --- | --- |
| **Text field** | Edit the displayed text |
| **Sample density** | How many points are sampled along each letter outline |
| **Within letters** | Thread density inside glyph bodies |
| **In gaps** | Thread density in counters, spacing, and cross-gap areas |
| **Line layers** | Number of stacked weave passes |
| **Line spacing** | Base vertical gap between stitch rows |
| **Layer step** | How much spacing increases per layer |
| **Stroke weight** | Line thickness |
| **Edge jitter** | Roughness at thread endpoints |
| **Thread sag** | How much threads droop and curve |
| **Download SVG** | Export the current weave as SVG |
