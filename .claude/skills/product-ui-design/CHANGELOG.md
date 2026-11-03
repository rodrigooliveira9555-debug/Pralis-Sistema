# Changelog

Notable changes to this skill. Format follows [Keep a Changelog](https://keepachangelog.com/);
released versions correspond to the GitHub releases / tags.

## [0.2.0] - 2026-06-11

### Added
- `scan-tells.py` detects the **Tailwind-utility** forms of the tells, not just the CSS-property forms: `transition-all`, `scale-0` / `scale-x-0` / `scale-y-0`, `bg-black` / `text-black`, and `outline-none` without a focus-visible ring.
- Shadow check covers **CSS-variable shadow tokens** (`--shadow-1: …`) — the shape the skill itself recommends — and **modern space-separated** color syntax (`rgb(0 0 0 / .5)`), in addition to `box-shadow:` with comma syntax.
- Pure-black text/bg check covers `rgb()` / `rgba()` in both comma and space syntax.
- **Pure-black color tokens** (`--foreground:#000`, `--background:black`) are flagged: the no-raw-hex rule pushes generated pure-black into token definitions the property-scoped check never saw. A pure-black `--border` token stays out of scope (a different, weaker tell).
- **Arbitrary-value Tailwind black** (`bg-[#000]`, `text-[#000000]`) — the escape hatch the keyword `bg-black`/`text-black` rule missed. Alpha overlays (`bg-[#000]/50`) are exempt, matching the `bg-black/50` exemption.
- Indigo Tailwind check now covers the `outline-`, `divide-`, `decoration-`, `accent-`, `caret-`, and `shadow-` utility prefixes, not just `bg`/`text`/`border`/`ring`/etc.
- Test suite (`tests/test_scan_tells.py`, 41 cases pairing each rule's hit and miss) and CI (`.github/workflows/test.yml`, Python 3.9 + 3.12).

### Fixed
- `:focus-within { outline: none }` is no longer false-flagged as a missing focus ring.
- `outline-none` and its `focus-visible:ring` are now reconciled within the whole **class context** (the `cn()` / `clsx()` call or `class` attribute), so a Prettier-wrapped className that splits them across lines is no longer false-flagged.
- Directory scans skip `node_modules`, `dist`, `build`, `.git`, and other third-party / build dirs, so running the gate at a project root no longer floods output with vendored-code hits.

### Changed
- Motion guidance clarified across `SKILL.md`, `primitives.md`, and `ai-tells.md`: cheap **paint-only** props (`color` / `background-color` / `box-shadow`) are allowed for **state** changes (hover, focus); only **layout** props and `transition: all` are banned. (Previously "animate only transform/opacity", which the worked example itself broke.)
- `references/example.md` brought into compliance with the doctrine: tokenized surface tints (no inline hex), on-grid spacing (no `13px`), and a precise `transition: background-color`.

## [0.1.0] - 2026-06-10

Initial public release. Restrained product-UI anti-slop skill — the counterpart to expressive marketing-design skills.

- `SKILL.md` — the doctrine (observe before invent / floor & ceiling / output-time hard-checks).
- `references/ai-tells.md`, `references/primitives.md`, `references/example.md`.
- `scripts/scan-tells.py` — optional, dependency-free mechanical gate.
