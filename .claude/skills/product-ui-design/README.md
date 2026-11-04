# product-ui-design

A Claude Code / Claude Agent **Skill** for building functional product UI — dashboards, SaaS tools, settings, app screens, admin panels, data tables, forms — that looks like a **real shipped product** (Apple / Linear / shadcn register), not generic AI slop.

It is the **counterpart to maximalist marketing design skills** (like the official `frontend-design`). Where those optimize for an unforgettable, distinctive artifact, this skill optimizes for the opposite register: **restraint, correctness, and the absence of the signals that mark a UI as AI-generated.**

## Why this exists

Left to default, models converge on a recognizable "slop" look for product UI: purple-blue gradients, glowing status dots, monospace eyebrow labels, evenly-timid palettes, four identical stat cells, a filled+ghost button pair in every hero. Marketing-oriented design skills don't fix this — several even *recommend* grain, glow, gradient mesh, and custom cursors, which are exactly the tells that read as AI-made in a product surface.

This skill fixes it with three disciplines:

1. **Observe before you invent** — anchor values to measured real products, not "modern and clean."
2. **Floor / ceiling** — know when to restrain (the functional floor) vs when to commit to character (the expressive ceiling), and never let ceiling techniques leak into the floor.
3. **Output-time hard-checks** — scan your own output against a curated list of common AI tells and replace each with a correct primitive. An optional `scan-tells.py` gate greps for the machine-detectable ones.

## When to use it

- **Use** for: dashboards, SaaS app screens, settings, admin panels, data tables, forms, internal tools, B2B product UI.
- **Don't use** for: expressive marketing pages, brand/landing heroes, campaign sites — use a marketing/expressive-design skill for that register instead (e.g. `frontend-design`).

Most real products have both surfaces; this skill governs the product surface.

## Contents

```
product-ui-design/
├── SKILL.md                  # the doctrine (loaded when the skill triggers)
├── references/
│   ├── ai-tells.md           # the output-time hard-check list
│   ├── primitives.md         # concrete default values (tokens, type, shadows, buttons,
│   │                         #   tables, settings, destructive actions, reference DNA profiles)
│   └── example.md            # one fully worked build (anchor → diverge → annotated code)
└── scripts/
    └── scan-tells.py         # optional mechanical gate (no dependencies)
```

## Install

Copy the directory into your skills directory, **keeping the folder name `product-ui-design/`** (it must match the `name` in the frontmatter for the skill to load):

- Claude Code: `~/.claude/skills/product-ui-design/`
- or a plugin / project `.claude/skills/product-ui-design/`

The skill activates automatically when you ask Claude to build product/app/dashboard UI. To verify it loaded, ask Claude to build a small dashboard and confirm it applies restraint (semantic tokens, status pills not glowing dots, tabular numbers).

Optional mechanical gate:

```
python scripts/scan-tells.py <your-file-or-dir>
```

## License

MIT — see `LICENSE`.
