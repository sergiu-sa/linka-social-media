# Roadmap

Items deliberately deferred from past sessions. These aren't bugs and aren't blocking — they're known follow-ups recorded so future me (or any contributor) doesn't waste time rediscovering them.

---

## Features

### Notifications — Tier B

- **Replies to your comments on other people's posts.** Tier A (reactions + comments on *your own* posts) is shipped. Tier B was scoped out of v1 because Noroff has no "my comment activity" endpoint, so we'd have to maintain a `localStorage` list of post IDs the user has commented on and re-fetch each one every poll cycle to scan for new replies. The notifications service is structured so this is an additional collector — no rewrite needed.
- **Filter / categorize the notifications panel** (likes vs comments) once the count grows.

### Search

- **Persist committed searches in the URL** (`/feed?q=python`) so back-button restores the searched view instead of clearing it. Currently search state lives only in `window.searchQuery` and is wiped on suggestion-click navigation. Would also make searches shareable.
- **Search-result pagination.** Right now we render whatever the Noroff endpoints return in one shot (effectively page 1 of results). For very common queries that's fine; for power users it's a soft cap.
- **Tag search** (`#tag`) — Noroff supports `?_tag=` filtering on the feed. Not yet wired.

### Posts

- **Permalink page** (`/post/:id`) instead of the modal-over-feed pattern. The current `?post=ID` URL is shareable and refresh-safe but renders as a modal. A dedicated permalink page would feel like a "real" destination — bigger lift, low priority.
- **Pinned post on profile.** Pick one of your own posts to highlight at the top of your profile. No API support, would be local-only.

### Profile

- **Banner / avatar via direct upload** instead of public URL. Noroff only accepts URLs — would need a third-party host (Cloudinary, etc.) to support this. Out of scope for the course brief.
- **"Member since" date** — Noroff doesn't return profile creation date. If they ever add it, surface it on the profile banner area.

---

## Refactors

These are non-urgent code-health items. Each was identified during a cleanup pass and consciously skipped because the cost wasn't worth the cleanup at the time.

- **Extract escape helpers.** `escAttr` / `escHtml` are duplicated across 6+ files (`postCard.ts`, `postModal.ts`, `feedHero.ts`, `ProfilePage.ts`, `FeedPage.ts`, `profileEditModal.ts`, `NavbarPage.ts`). Move to `src/utils/html.ts`. One-PR refactor that touches every component file.
- **Unify reaction toggle.** `FeedPage.handleToggleReaction` and `postModal.handleLikeToggle` share the same optimistic-toggle + rollback algorithm with different side effects (mirror-back, pulse, toast). Extract a `optimisticReactionToggle(button, postId, options)` helper. ~30 lines saved.
- **Consolidate `getCurrentUsername` flavors.** At least three implementations exist with different fallback behaviors (`FeedPage` uses `getLocalItem('user')` directly, `ProfilePage` has a JWT-payload fallback in `getStoredUsername`, `notifications.ts` returns `null` for empty strings). Pick one and standardize.
- **`AbortController` for navbar search outside-click listener.** A small leak: each navbar rebuild (login / logout cycle) attaches a new `document` click listener without cleaning up the old one. Old handlers reference dead DOM nodes and do nothing useful, but they accumulate. Use `AbortController.signal` so all listeners auto-clean when the controller is aborted.
- **Split `FeedPage.ts`** (~1,400 lines) into smaller files using the explicit `markup() + mount()` pattern from `feedHero.ts`. Same option for `postCard.ts` if the action dispatcher grows further. Listed in the design system as Phase 5 (optional).
- **Profile-page comment handling.** `ProfilePage` mounts `wirePostCardActions()` but the comment / reaction handlers (`window.toggleComments`, `window.toggleReaction`, etc.) are wired by `FeedPage` only. So clicking comments on a profile-page post silently no-ops if the user hasn't visited `/feed` yet in the same SPA session. The reading-mode modal sidesteps this (it imports `openPostModal` directly), but the in-card comment toggle is still affected. Either move the wiring into `postCard.ts` or have `ProfilePage` register its own handlers.

---

## Polish

- **Notifications panel: relative timestamps** ("3m ago") instead of just sorting by `latestAt`.
- **Tag search from post-card chips** — clicking a `#tag` on a post-card should run a tag search. Currently they're inert spans.
- **Feed search "clear" affordance** — the hero shows "SEARCH · 'X' · N RESULTS" with a `clear` link in the eyebrow. Consider mirroring this in the navbar input (an × icon to clear without retyping).
- **Reduced-motion audit** for the new surfaces — `post-modal-card-in`, `post-modal-backdrop-in`, `feed-composer-enter` already have reduced-motion overrides. Sweep the remaining additions (search dropdown, people-strip hover lift, follow-chip hover lift) for parity.

---

## When committing items here

When you ship one of these, delete its bullet (or move it under a `## Done` section if you want a paper trail). Keep this file short — it's a working document, not history.
