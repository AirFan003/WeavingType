# Weaving Type

Interactive generative typography sketch — letters stitched together with woven horizontal lines.

Based on the [#Genuary2024 day 20](https://genuary.art/prompts#jan20) prompt.

## Setup

Serve the folder locally:

```bash
npx serve .
```

Then open the URL shown in your terminal (usually `http://localhost:3000`). The font is loaded from a CDN automatically.

## Controls

| Control | Effect |
| --- | --- |
| **Text field** | Edit the displayed word |
| **Keyboard** | Type to append letters; Backspace deletes |
| **Sample density** | How many points are sampled along each letter outline (finer weave) |
| **Line layers** | Number of stacked weave passes |
| **Line spacing** | Base vertical gap between stitch rows |
| **Layer step** | How much spacing increases per layer |
| **Stroke weight** | Line thickness |
