# LINKA Design System

A documented design system for the LINKA SPA. This file summarizes what's been audited, what's been tokenized, what's intentional vs. accidental, and what's planned. The full audit (~3,000 lines, every site catalogued with file:line refs) is kept locally as working notes; this is the public-facing summary.

---

## Why this exists

LINKA started as a course assignment and grew through multiple visual redesigns. Each redesign introduced its own conventions without rolling them back into a shared system. By late April 2026 the codebase had:

- **16 distinct `border-radius` values** for what's conceptually a 5-step scale
- **28 distinct `box-shadow` recipes** clustering into 7 logical families
- **37 distinct `font-size` values** with a 12-value cluster all serving the same "small body / meta / caption" role
- **A dark/light theme bug** where three high-traffic surfaces (`.feed-page`, `.linka-profile`, `.linka-confirm-panel`) rendered dark in light mode because the theme system sets BOTH `.dark` and `.light-mode` on `<html>` in lockstep, and `.dark .x` rules with no `html.light-mode .x` counterpart always won
- **20+ buttons** with no `:focus-visible` style — keyboard users got the browser default ring or nothing
- **A perpetually-spinning auth logo** with no `prefers-reduced-motion: reduce` override (vestibular safety violation)

This document records what was found, what was decided, and what was shipped.

---

## Token system

Tokens live in `src/styles/base/tokens.css` and are imported by the slim `src/style.css` entry before any other partial. They cover the categories most-used across the codebase.

| Category | Count | Examples |
|---|---|---|
| Color | 12 + 6 light overrides | `--color-orange`, `--color-bg-base`, `--color-fg-base`, `--color-success`, `--color-error`, `--color-orange-tint`, `--color-orange-tint-hover` |
| Alpha ladder | 5 | `--alpha-faint` (0.08) → `--alpha-bold` (0.75) |
| Typography | 11 | `--font-display`, `--font-body`, `--font-mono`, `--text-xs` → `--text-4xl` |
| Spacing | 11 | `--space-1` (4px) → `--space-24` (96px) — 4px-based scale |
| Radius | 7 | `--radius-xs` → `--radius-xl`, `--radius-pill`, `--radius-circle` |
| Shadow | 7 | `--shadow-card-rest/hover`, `--shadow-cta-rest/hover`, `--shadow-cta-danger-rest/hover`, `--shadow-focus-ring` |
| Motion | 4 | `--motion-fast` (150ms) → `--motion-slower` (500ms) |
| Z-index | 6 | `--z-base` (0) → `--z-toast` (2000) |

**Total: 63 tokens** + 6 light-mode overrides = 69 declarations.

### Theme architecture

The theme system sets BOTH `.dark` AND `.light-mode` on `<html>` in lockstep. The token system declares dark values at `:root` and overrides only the theme-dependent tokens in `html.light-mode`:

```css
:root {
  --color-bg-base: rgb(15 23 42);
  --color-fg-base: rgb(248 250 252);
  /* … other tokens … */
}

html.light-mode {
  --color-bg-base: #fff7f2;
  --color-fg-base: #0e0d0a;
}
```

Surface CSS writes one rule per property; the swap is automatic:

```css
.feed-page {
  background: var(--color-bg-base); /* swaps automatically */
  color: var(--color-fg-base);
}
```

This eliminates the entire class of dark/light parity bugs the audit caught.

---

## Audit decisions

Eight design decisions were resolved before tokens were defined. Each is recorded here with the rationale so a future contributor doesn't re-litigate.

| # | Decision | Resolution |
|---|---|---|
| 1 | Rose (`#be123c`) vs red (`#ef4444`) for error | Converged to single `--color-error: #ef4444`. Auth message migrates from rose to red. |
| 2 | Light-mode text — warm `#0e0d0a` or neutral `#1a1a1a` | Warm wins. Single `--color-fg-base-light: #0e0d0a` matches the warm-paper light theme. |
| 3 | `.auth-submit` weight 900 + full-width vs converge to `.btn--primary` | **Keep editorial.** Auth shell has a distinct heavier feel; preserving it is intentional brand voice. |
| 4 | Borderless composer focus indicator | Underline approach: `box-shadow: inset 0 -2px 0 var(--color-orange)` on focus. Preserves borderless aesthetic. |
| 5 | Hero compose CTA brutalist square (no radius) vs converge | **Converge.** Hero CTA gets `var(--radius-md)`, gradient, lift. Brutalist exception dropped for codebase consistency. |
| 6 | Icon-label gap `0.4rem` (off-scale, 11 sites) | Migrate to `--space-2: 0.5rem`. 1px shift × 11 sites — invisible in practice; scale stays clean. |
| 7 | Auth shell radius `0.75rem` separate or absorb | Round to `--radius-lg: 0.85rem`. Auth stays heavier without an exception token. |
| 8 | Danger button shadow separate or color-slot variant | Separate tokens (`--shadow-cta-danger-rest/hover`). Two extra tokens vs one clever pattern; cost is minimal. |

---

## Accessibility commitments

The audit caught real WCAG failures. The fixes shipped across two waves:

**Wave 1:**

- **Vestibular safety** — `auth-rotate` 30s perpetual spin gets `prefers-reduced-motion: reduce` override.
- **WCAG 2.4.7 Focus Visible** — three borderless composer inputs (`#post-title`, `#post-body`, `.feed-thread-compose input`) gained underline focus indicators. 20 buttons that lacked any focus style gained a shared `:focus-visible` rule using `--shadow-focus-ring`.
- **Icon-only button labels** — like + comment-toggle buttons in `postCard.ts` gained dynamic `aria-label`s with reaction/comment counts.
- **Skip-to-main link** — keyboard users tab onto a focusable orange "Skip to main content" anchor before the navbar.
- **Toast live-region semantics** — both toast helpers (`FeedPage.ts`, `NavbarPage.ts`) gained explicit `aria-live` (`polite` / `assertive` per type) + `aria-atomic`.

**Wave 2:**

- **Composer / reply input labels** — 6 inputs (post title, body, tags, image URL, image alt, reply input) gained `aria-label`s. Reply input includes the comment author's name in its label.
- **Edit-post modal as proper dialog** — `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Focus trap installed on open (Tab cycles within the modal; Shift+Tab from first wraps to last). Title input receives initial focus. Escape closes. Focus returns to the element that opened the modal.
- **Reactions picker keyboard support** — Tab from the like button opens the picker (focusin); Tab through emoji buttons; Escape closes the picker and returns focus to the like button.

---

## Migration roadmap

| Phase | Status | What it does |
|---|---|---|
| Phase 1 — Audit | ✅ Complete | Catalogued every visual + technical inconsistency; proposed 112-token taxonomy; recorded 8 user-decision items. |
| Phase 2 — Token foundation (minimal) | ✅ Complete | 59 tokens + 6 light-mode overrides declared in `src/styles/base/tokens.css`. Tokens declared but mostly unused — Phase 3+ surface waves consume them. |
| Hotfix — dark/light parity | ✅ Complete | Three broken surfaces (`.feed-page`, `.linka-profile`, `.linka-confirm-panel`) now use `var(--color-bg-base)` and swap correctly. First real consumption of Phase 2 tokens. |
| Wave — A11y blockers (round 1) | ✅ Complete | 6 WCAG fixes shipped (see Accessibility commitments above). |
| Wave — A11y blockers (round 2) | ✅ Complete | Composer/reply input labels, edit-post modal focus trap + dialog semantics, reactions picker Escape support. |
| Bundle code-split | ✅ Complete | Three.js + GSAP moved to a lazy chunk. Main bundle reduced from ~658 KB to ~101 KB. |
| Phase 3 — Surface migrations | ✅ Complete | Surface-by-surface tokenization across 7 waves: feed (1a) → toast/confirm (1b) → profile (1c) → navbar/footer (1d) → auth shell (1e) → intro (1f) → loader/404/globals (1g). Token references grew from 16 → 402 across the file. |
| Phase 3.5 — Audit resolutions | ✅ Complete | The five behavioral fixes from the audit decision list: rose-to-red error (#1), hero CTA convergence (#5), icon-label gap to scale (#6), auth radius round-up (#7), danger CTA shadow tokens (#8). Two new shadow tokens added. |
| Phase 4 — Post-launch surfaces | ✅ Complete | New surfaces shipped after the original audit, all consuming the existing token set: **reading-mode post modal** (`postModal`), **profile edit modal** (`profileEditModal`), **profile banner + avatar overlap**, **profile settings tab** (notification prefs + sign-out), **search typeahead dropdown** + **People strip** in feed search results, **navbar notifications bell + dropdown**, **per-post-card follow chip**, **post-card top-comment preview**, **feed-hero ambient starfield/node-mesh** behind the threeStar canvas. Like button collapsed from multi-emoji picker to single ❤️ with optimistic-toggle + rapid-click race protection. |
| Phase 5 — Optional refactor | 📋 Optional | `FeedPage.ts` (~1,400 lines) → smaller files using the explicit `markup() + mount()` split (the pattern established by `feedHero.ts` / `threeStar.ts`). High cost vs payoff; defer until file becomes painful. Same option for `postCard.ts` if the action-dispatcher grows further. |

---

## File map

| Path | Role |
|---|---|
| `src/style.css` | Slim entry — `@import`s every partial in original source order. |
| `src/styles/base/tokens.css` | All design tokens. Single source of truth. |
| `src/styles/base/globals.css` | `html`/`body` rules, body-padding gating, light-mode body overrides. |
| `src/styles/base/a11y.css` | Shared `:focus-visible` and `.sr-only` rules. |
| `src/styles/surfaces/` | One file per page surface (`auth-shell`, `intro-chrome`, `feed`, `profile`, `profile-settings`, `footer`, `loading-screen`, `not-found`). |
| `src/styles/components/` | One file per component (`feed-hero`, `post-card`, `composer`, `comments-thread`, `pagination`, `people-strip`, `post-modal`, `navbar`, `search-typeahead`, `notifications-bell`, `profile-edit-modal`, `confirm-dialog`, `toast`). |
| `src/components/feedHero.ts` | Reference pattern — explicit `markup() + mount()` split for new components. |
| `src/components/threeStar.ts` | Reusable Three.js component shared between intro page and feed hero. |
| `src/components/starfield.ts` | Reusable 2D ambient background — twinkling stars in dark, orange node-mesh in light. Used by feed hero. |
| `src/components/postModal.ts` | Reading-mode post overlay. Reference for modal-as-singleton + URL contract pattern. |
| `src/components/profileEditModal.ts` | Edit-profile modal. Reference for inline image-preview + form validation. |
| `src/components/notificationsBell.ts` | Navbar bell + dropdown panel. Subscribes to the notifications service via a small in-module emitter. |
| `src/utils/theme.ts` | Theme system (sets `.dark` + `.light-mode` on `<html>` in lockstep). |
| `src/utils/confirm.ts` | Focus-trapped confirm dialog. Reference for modal a11y. |

---

## Conventions for new code

- **Naming** — `<surface>-<element>[--<modifier>]` BEM-lite. Surface prefixes: `feed-`, `auth-`, `intro-`, `linka-` (shared shell), `notification-`.
- **State classes** — `is-active`, `is-pulsing`, `is-loading`, `is-following`, `is-danger`.
- **Tailwind vs custom CSS** — Tailwind utilities for one-off layout (chrome strips, ad-hoc spacing); custom CSS in the matching `src/styles/components/` or `src/styles/surfaces/` partial for component-scoped rules. Edit-post modal is the one inline-Tailwind exception still standing.
- **Components** — new components export `componentMarkup(data): string` AND `mountComponent(data): handle`. Existing pages stay implicit (`Promise<string>` + `setTimeout` post-render hook) unless they grow large enough to warrant the split.
- **Comments** — default to none. Write one only when the *why* is non-obvious (workaround, hidden constraint, perf trick). No `@author`, no AI attribution, no "🤖 Generated" footers.
- **Reduced motion** — every surface with `transition:` or `animation:` MUST also have a `prefers-reduced-motion: reduce` override that disables or shortens it.
- **Focus indicators** — every interactive element has either an explicit `:focus-visible` rule (using `--shadow-focus-ring` for buttons or the underline pattern for borderless inputs) OR is covered by the shared rule in `src/styles/base/a11y.css`.
