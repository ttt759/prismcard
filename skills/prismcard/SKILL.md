---
name: prismcard
description: Render Markdown as high-resolution PNG social cards or swipeable decks using local Chrome or Edge. Use when asked to turn notes, articles, snippets, or checklists into shareable card images.
license: MIT
---

# PrismCard

Render a Markdown file into ordered PNG cards and a manifest. Use Node.js 20.19+ or 22.12+ and system Chrome, Edge, or Chromium.

1. Locate the input file and confirm the requested theme, ratio, language, and output destination from the user’s brief. When composing a deck, follow the rules below.
2. Run `npm ci` in this skill directory if `playwright-core` is missing. The skill already contains its renderer.
3. Render with the requested settings.

   ```sh
   node scripts/render-cards.mjs --input "/path/to/notes.md" --out "/path/to/cards" --theme editorial --ratio 3:4 --lang zh
   ```

4. Check `manifest.json` for the count, headings, and dimensions. Return the PNG paths in order. If a fixed frame overflows and the ratio is required, shorten or split the content or reduce type size. Use `--ratio auto` when the ratio is flexible.

## Golden card-splitting and copywriting rules

- **Card 1 · Hook cover.** Write one punchy `# Title` of at most 18 Chinese characters or 10 English words, one short `> subtitle or hook`, and two to four trailing `#hashtags`.
- **Body · One idea per card.** Separate cards with a standalone `---`, or start each section with `##` and enable `--split-h2`. Aim for 80–140 Chinese characters or 50–90 English words per fixed 3:4 card. Use bullet points, `==highlighted key phrases==`, a table, or a fenced code snippet of at most 12 lines. Break dense prose into shorter cards with distinct takeaways.
- **Final card · Actionable takeaway.** Close with a summary table or a `- [x]` / `- [ ]` checklist the reader can act on.

Frontmatter at the start of the file can set `title`, `author`, `tag`, and `theme`. CLI flags take precedence. Separators inside fenced code remain part of the snippet.

## CLI flags

| Flag | Effect |
| --- | --- |
| `-i, --input <file.md>` | Markdown input. A single positional path also works. |
| `-o, --out <dir>` | Output directory. Defaults to `./prismcard-cards`. |
| `-f, --overwrite` | Replace the numbered card PNGs and manifest, including stale numbered PNGs from a longer deck. |
| `--theme <name>` | `editorial`, `swiss`, `cyber`, `brutal`, `aurora`, or `craft`. |
| `--ratio <preset>` | `3:4` (1080 × 1440, default), `1:1` (1080 × 1080), `16:9` (1600 × 900), or `auto` (1080 px wide). |
| `--scale <85–120>` | Font scale percentage. Defaults to 100. |
| `--padding <density>` | `compact`, `balanced` (default), or `airy`. |
| `--author <handle>` | Byline or brand handle in the footer. |
| `--tag <series>` | Series label in the header. |
| `--lang <en\|zh>` | Card typesetting language. Defaults to `en`. |
| `--split-h2` | Start a card at each top-level `##` heading. |
| `--no-counter` | Hide page numbers. |
| `--no-watermark` | Hide the PrismCard watermark. |
| `--browser <path>` | Use a specific system browser executable. |
| `-h, --help` | Show CLI usage. |

Card indices start at 1. When reusing a destination, pass `--overwrite` if the user wants the previous deck replaced.
