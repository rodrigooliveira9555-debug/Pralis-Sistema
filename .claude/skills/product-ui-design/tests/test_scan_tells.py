"""Tests for scan-tells.py — the mechanical tell gate.

Loaded via importlib because the script filename contains a hyphen and is not an
importable module name. Each case writes a small snippet to a temp file and
asserts which rule ids fire (or stay silent), so a regex edit that opens a blind
spot or a false positive fails here instead of in real use.
"""

import importlib.util
from pathlib import Path

import pytest

_SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "scan-tells.py"
_spec = importlib.util.spec_from_file_location("scan_tells", _SCRIPT)
scan_tells = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(scan_tells)


def fired(tmp_path: Path, name: str, text: str) -> tuple[set[str], set[str]]:
    """Write *text* to a temp file, scan it, return (tell ids, review ids)."""
    f = tmp_path / name
    f.write_text(text, encoding="utf-8")
    _files, hits, reviews = scan_tells.scan([str(f)])
    return {h[2] for h in hits}, {r[2] for r in reviews}


# (case id, filename, snippet, rule that MUST fire)
DETECT = [
    # Tailwind utility classes — the most common shape of generated product UI.
    (
        "tw-transition-all",
        "a.html",
        '<div class="transition-all">x</div>',
        "transition-all-tw",
    ),
    ("tw-scale-0", "a.html", '<div class="scale-0">x</div>', "scale-zero-tw"),
    ("tw-scale-x-0", "a.html", '<div class="scale-x-0">x</div>', "scale-zero-tw"),
    ("tw-bg-black", "a.html", '<div class="bg-black">x</div>', "pure-black-tw"),
    (
        "tw-text-black",
        "a.html",
        '<div class="hover:text-black">x</div>',
        "pure-black-tw",
    ),
    ("tw-indigo", "a.html", '<div class="bg-indigo-500">x</div>', "indigo-tailwind"),
    (
        "tw-outline-none",
        "a.html",
        '<button class="focus:outline-none">x</button>',
        "tw-outline-none",
    ),
    # CSS-variable shadow token — the shape the skill itself recommends.
    (
        "token-shadow-comma",
        "a.css",
        ":root{--shadow-1:0 1px 2px rgba(0,0,0,.5)}",
        "black-shadow",
    ),
    # Modern space-separated color syntax (Tailwind v4 / recent CSS).
    (
        "shadow-space-rgb",
        "a.css",
        ".x{box-shadow:0 1px 2px rgb(0 0 0 / .5)}",
        "black-shadow",
    ),
    ("shadow-hash000", "a.css", ".x{box-shadow:0 1px 2px #000}", "black-shadow"),
    ("color-rgb-black", "a.css", ".x{color:rgb(0,0,0)}", "pure-black-text-bg"),
    # Pure black defined as a token — the shape the skill's no-raw-hex rule forces.
    ("token-foreground-000", "a.css", ":root{--foreground:#000}", "token-pure-black"),
    ("token-bg-keyword", "a.css", ":root{--background:black}", "token-pure-black"),
    (
        "token-fg-space-rgb",
        "a.css",
        ":root{--text:rgb(0 0 0)}",
        "token-pure-black",
    ),
    # Arbitrary-value Tailwind black (escape hatch the keyword rule misses).
    (
        "tw-arbitrary-black",
        "a.html",
        '<div class="bg-[#000]">x</div>',
        "arbitrary-black-tw",
    ),
    (
        "tw-arbitrary-black6",
        "a.html",
        '<div class="text-[#000000]">x</div>',
        "arbitrary-black-tw",
    ),
    # Indigo on the newly-covered utility prefixes.
    (
        "tw-indigo-accent",
        "a.html",
        '<input class="accent-indigo-600" type="checkbox">',
        "indigo-tailwind",
    ),
    (
        "tw-indigo-outline",
        "a.html",
        '<button class="outline-violet-500">x</button>',
        "indigo-tailwind",
    ),
    # Existing CSS-property rules must keep working.
    ("css-transition-all", "a.css", ".x{transition:all .2s}", "transition-all"),
    ("css-color-000", "a.css", ".x{color:#000}", "pure-black-text-bg"),
    ("css-scale-zero", "a.css", ".x{transform:scale(0)}", "scale-zero"),
    ("css-focus-none", "a.css", ".x:focus{outline:none}", "focus-outline-none"),
]


@pytest.mark.parametrize("cid,name,text,rule", DETECT, ids=[c[0] for c in DETECT])
def test_detects(tmp_path, cid, name, text, rule):
    tells, _reviews = fired(tmp_path, name, text)
    assert rule in tells, f"{cid}: expected {rule!r}, got {tells}"


# (case id, filename, snippet, rule that MUST NOT fire — a false positive guard)
CLEAN = [
    ("tw-scale-50", "a.html", '<div class="scale-50">x</div>', "scale-zero-tw"),
    (
        "tw-bg-black-alpha",
        "a.html",
        '<div class="bg-black/50">x</div>',
        "pure-black-tw",
    ),
    (
        "tw-transition-colors",
        "a.html",
        '<div class="transition-colors">x</div>',
        "transition-all-tw",
    ),
    ("tw-border-black", "a.html", '<div class="border-black">x</div>', "pure-black-tw"),
    (
        "tw-outline-none-ring",
        "a.html",
        '<button class="focus:outline-none focus-visible:ring-2">x</button>',
        "tw-outline-none",
    ),
    (
        "css-focus-within",
        "a.css",
        ".f:focus-within{outline:none}",
        "focus-outline-none",
    ),
    (
        "css-focus-visible",
        "a.css",
        ".f:focus-visible{outline:none}",
        "focus-outline-none",
    ),
    (
        "css-focus-ring",
        "a.css",
        ".x:focus{outline:none;box-shadow:0 0 0 3px #88aaff}",
        "focus-outline-none",
    ),
    (
        "tinted-shadow",
        "a.css",
        ".x{box-shadow:0 1px 2px rgba(16,40,32,.05)}",
        "black-shadow",
    ),
    ("near-black-color", "a.css", ".x{color:#1a1a1a}", "pure-black-text-bg"),
    ("border-color-black", "a.css", ".x{border-color:#000}", "pure-black-text-bg"),
    # A near-black text token is correct — must not trip the new token rule.
    ("token-near-black", "a.css", ":root{--foreground:#1a1a1a}", "token-pure-black"),
    # A pure-black *border* token is a different (weaker) tell, out of this rule's scope.
    ("token-border-black", "a.css", ":root{--border:#000}", "token-pure-black"),
    # Arbitrary near-black is fine; only literal #000/#000000 should fire.
    (
        "tw-arbitrary-near-black",
        "a.html",
        '<div class="bg-[#0a0a0a]">x</div>',
        "arbitrary-black-tw",
    ),
    # Alpha overlay in arbitrary form — same legitimate backdrop pattern the
    # keyword rule exempts as bg-black/50; the two rules must agree.
    (
        "tw-arbitrary-black-alpha",
        "a.html",
        '<div class="bg-[#000]/50">x</div>',
        "arbitrary-black-tw",
    ),
]


@pytest.mark.parametrize("cid,name,text,rule", CLEAN, ids=[c[0] for c in CLEAN])
def test_does_not_fire(tmp_path, cid, name, text, rule):
    tells, _reviews = fired(tmp_path, name, text)
    assert rule not in tells, f"{cid}: did not expect {rule!r}, got {tells}"


def test_excludes_third_party_dirs(tmp_path):
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "junk.css").write_text(
        ".x{color:#6366f1}", encoding="utf-8"
    )
    (tmp_path / "app.css").write_text(".y{color:#16704a}", encoding="utf-8")
    files, hits, _reviews = scan_tells.scan([str(tmp_path)])
    assert not any("node_modules" in f for f in files)
    assert not any(h[2] == "indigo-accent" for h in hits)


def test_clean_file_has_no_tells(tmp_path):
    text = ".x{color:#1a1a1a;background:#fff;box-shadow:0 1px 2px rgba(16,40,32,.05)}"
    tells, _reviews = fired(tmp_path, "a.css", text)
    assert tells == set()


# Prettier splits a long className across lines via cn(), so outline-none and its
# focus-visible ring land on different lines. The ring is still in the same class
# context, so the gate must stay silent — a line-scoped check would false-flag it.
def test_outline_none_multiline_cn_with_ring_is_clean(tmp_path):
    text = (
        "<button\n"
        "  className={cn(\n"
        '    "rounded-md border focus:outline-none",\n'
        '    "focus-visible:ring-2 focus-visible:ring-offset-2",\n'
        "  )}\n"
        ">x</button>\n"
    )
    tells, _reviews = fired(tmp_path, "a.tsx", text)
    assert "tw-outline-none" not in tells


# Same multi-line shape but with NO ring anywhere in the context — must fire.
def test_outline_none_multiline_cn_without_ring_fires(tmp_path):
    text = (
        "<button\n"
        "  className={cn(\n"
        '    "rounded-md border focus:outline-none",\n'
        '    "px-3 py-2",\n'
        "  )}\n"
        ">x</button>\n"
    )
    tells, _reviews = fired(tmp_path, "a.tsx", text)
    assert "tw-outline-none" in tells
