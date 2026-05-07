# LINKA — Editorial Social Feed

A responsive social-media SPA built on top of the Noroff Social API v2, written in TypeScript and styled with Tailwind CSS v4 + scoped editorial CSS. Single orange accent on slate, distinctive 3D intro, real reading-mode for posts, ambient constellation background.

> **Final submission for the Noroff FED2-24 CSS Frameworks course assignment**, fully restructured beyond the original team build.

---

## Live project

- **Production:** https://linka-social.netlify.app/
- **Repository:** https://github.com/sergiu-sa/linka-social-media
- **API base:** `https://v2.api.noroff.dev`
- **Design system:** [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — tokens, theme architecture, accessibility commitments, migration roadmap.

---

## Features

### Authentication
- Registration restricted to `@stud.noroff.no` email addresses
- JWT login persisted to `localStorage`; API key fetched on-demand
- Logged-in users hitting `/`, `/login`, or `/register` are redirected to `/feed`; unauthenticated users hitting protected routes are redirected to `/`

### Feed
- Editorial single-column feed with the **constellation console hero** (live pulse rows + threeStar visualization + ambient starfield/node-mesh background)
- **Reading-mode modal** for posts — backdrop blur, contained image (`max-height: 50vh`, `object-fit: contain`), sticky action bar, full-screen drawer on mobile. Replaces inline expand
- Composer triggered exclusively from the hero compose rail (single source, no duplicate affordance)
- Image clickable as another way into the modal
- Pagination with prev / numbered pages / next + a "Jump to page" input on long feeds
- Post-card top-comment preview when a post has at least one comment
- Single-heart like (no multi-emoji picker), optimistic UI, button locks during in-flight to prevent rapid-click race conditions

### Profiles
- **Full-bleed banner** image with avatar overlapping the bottom edge
- Stats bar (posts / following / followers)
- Five tabs: Posts · Media · Following · Followers · **Settings** (own profile only)
- **Edit-profile modal** — update avatar URL + alt, banner URL + alt, bio (160-char counter); inline image-preview probes before submit; surfaces server-side errors inline
- **Follow / Unfollow** chip on each post-card author *and* a CTA button on profile pages, with optimistic UI and same-author dedupe across the feed

### Notifications
- **Bell in the navbar** with red-dot badge + dropdown panel listing posts with new likes/comments
- Polling every 1–2 minutes (configurable), gated on `document.visibilityState` so hidden tabs don't burn cycles
- **First-run bootstrap** — no "+47 likes" greeting on first login
- **Settings panel** lets you toggle on/off, choose cadence (30s / 1m / 2m / Manual), and opt into OS-level browser notifications via the Notification API
- Per-post snapshot in `localStorage`, marks-read individually or in bulk

### Search
- **Server-side** via `/social/posts/search` and `/social/profiles/search` called in parallel — no more "first 50 only" client-side filtering
- 250 ms debounced typeahead dropdown (top 4 people + top 4 posts)
- Stale-response guard so an early request can't overwrite a later one's UI
- "See all results" navigates to the feed with a horizontally scrollable People strip + filtered post list
- Click-anywhere navigation: profile suggestions go to the profile, post suggestions open the reading-mode modal

### Theme
- Single source of truth in `utils/theme.ts` — applies both `.dark` and `.light-mode` classes in lockstep so every selector convention works
- Global `linka-theme-changed` event lets components react (the threeStar mesh recolors live, the starfield switches between stars and node-mesh)

### Accessibility
- Every modal: focus restored on close, Esc + backdrop click + × button to dismiss
- Action chips have proper `aria-label` reflecting count + intent
- `prefers-reduced-motion: reduce` honored on the intro page, the loading screen, the post and profile-edit modals, the toast notifications, and the confirm dialog
- Keyboard-reachable post navigation (image, body, and header all accept Enter/Space)
- Toast notifications use `role="status"` / `role="alert"` for screen readers

---

## Tech stack

| | |
|---|---|
| **Language** | TypeScript (strict) |
| **Bundler** | Vite |
| **CSS** | Tailwind CSS v4 (`@tailwindcss/vite`, no `tailwind.config.js`) + scoped custom CSS in `src/style.css` |
| **Fonts** | `@fontsource/bebas-neue` (display), `@fontsource/open-sans` (body) |
| **Icons** | [Lucide](https://lucide.dev/) |
| **3D / motion** | Three.js + GSAP (intro page interactive star + feed hero ambient star + starfield/node-mesh) |
| **API** | Noroff Social API v2 |
| **Tests** | Vitest + jsdom |
| **Formatter** | Prettier |
| **Deployment** | Netlify |

---

## Quick start

### Prerequisites
- Node.js v18+
- npm
- A Noroff `@stud.noroff.no` account

### Install

```bash
git clone https://github.com/sergiu-sa/linka-social-media.git
cd linka-social-media
npm install
cp .env.example .env
```

### Environment

```bash
VITE_API_URL=https://v2.api.noroff.dev
```

If `VITE_API_URL` is unset, the app falls back to the production Noroff API.

### Develop

```bash
npm run dev          # http://localhost:5173
```

### Build / preview

```bash
npm run build
npm run preview
```

### Test

```bash
npm test             # watch mode
npx vitest run       # one-shot, 38 tests
```

Smoke tests live next to the source they cover (`src/utils/date.test.ts`, `src/utils/storage.test.ts`, `src/utils/heroSignals.test.ts`, `src/utils/lastVisit.test.ts`).

---

## Project structure

```text
src/
├── components/
│   ├── feedHero.ts          # Constellation console (pulse rows + threeStar + starfield)
│   ├── notificationsBell.ts # Navbar bell + dropdown panel
│   ├── postCard.ts          # Editorial post-card + delegated event dispatcher
│   ├── postModal.ts         # Reading-mode modal
│   ├── profileEditModal.ts  # Avatar / banner / bio editor
│   ├── starfield.ts         # 2D ambient atmosphere (dark = stars, light = node mesh)
│   └── threeStar.ts         # 3D star (intro + hero modes)
├── pages/
│   ├── IntroAuthPage.ts     # / — cinematic 3D star intro + chrome strips
│   ├── LoginPage.ts         # /login
│   ├── RegisterPage.ts      # /register
│   ├── auth/authShell.ts    # Shared editorial split-screen renderer
│   ├── FeedPage.ts          # /feed (protected)
│   ├── ProfilePage.ts       # /profile (protected)
│   ├── NavbarPage.ts        # Top nav with search + bell + theme toggle
│   ├── FooterPage.ts
│   ├── LoadingScreen.ts
│   └── NotFoundPage.ts
├── services/
│   ├── api/client.ts        # HTTP client (apiClient + authPost)
│   ├── auth/handler.ts      # Login/register form submit handler
│   ├── error/error.ts       # ApiError class
│   ├── follow/follow.ts     # Follow / unfollow / fetchFollowingSet
│   ├── interactions/        # Comments + reactions
│   ├── notifications/       # Polling service + prefs + snapshot
│   ├── posts/posts.ts       # Posts CRUD + comments fetch
│   ├── profile/profile.ts   # PUT /social/profiles/{name}
│   └── search/search.ts     # Posts + profiles search (parallel)
├── router/index.ts          # Custom SPA router with auth-gated redirects + scroll-restoration
├── types/index.ts           # Shared types + unified Window globals
├── utils/
│   ├── auth.ts              # isLoggedIn / logout / token helpers
│   ├── confirm.ts           # Focus-trapped Promise-based confirm dialog
│   ├── date.ts              # getTimeAgo (covered by tests)
│   ├── heroSignals.ts       # Pulse-row + arm-label computation
│   ├── icon.ts              # Lucide → SVG string helper
│   ├── lastVisit.ts         # Last-visit timestamp tracking
│   ├── log.ts               # Dev-only console wrapper (no-op in production)
│   ├── storage.ts           # localStorage shim (covered by tests)
│   └── theme.ts             # Single source of truth for light/dark theme
├── constant.ts              # API_URL + APP_CONTAINER_CLASSNAME
├── main.ts                  # Application entry
└── style.css                # Tailwind + all custom CSS (sectioned)
```

---

## Architecture highlights

- **Delegated event dispatcher** in `components/postCard.ts` — a single document-level click + keydown listener handles every interaction on every post card via `data-action` attributes. Adding a new card action means adding one `case` and the card is wired everywhere it's rendered (feed, profile, search results).
- **Reading-mode modal** is self-contained — owns its own listeners, builds from the `<article>`'s existing data-* attributes (zero extra fetch for the post itself), pushes `?post=ID` to history so refresh / deep-link / browser-back behave naturally.
- **Polling-based notifications** — Noroff has no push channel, so the service periodically fetches the user's posts and diffs `_count.reactions` and `_count.comments` against a `localStorage` baseline. A first-run bootstrap captures the current state silently so users don't get greeted with "+47 likes" on first login.
- **Single source of truth for theme** — toggling on any page sets both `.dark` and `.light-mode` on `<html>` in lockstep and emits a `linka-theme-changed` event. Components subscribe (the threeStar mesh recolors live, the starfield switches modes) without a re-render.
- **Strict TypeScript** with a unified `Window` interface in `src/types/index.ts` — every component that exposes a global handler types it there, no `(window as any)` at call sites.

---

## Known constraints (Noroff API)

These are **API-imposed**, not bugs:

- **Username and email are immutable** — `PUT /social/profiles/{name}` accepts only `bio`, `avatar`, and `banner`. The Settings tab calls this out.
- **No password reset endpoint** — `/auth/forgot-password`, `/auth/reset-password`, and `/auth/update-password` all 404. Locked-out users have to register a fresh `@stud.noroff.no` account.
- **No notifications endpoint, no WebSocket / SSE / push** — hence the polling-with-localStorage-snapshot architecture.
- **Comments are embedded in the post payload** when fetched with `?_comments=true`; there's no dedicated comments-listing endpoint.
- **Follow/unfollow PUT requests must have an empty body** — sending `{}` with `Content-Type: application/json` is rejected with a generic "Something went wrong". The `apiClient.put` helper now omits the body and Content-Type header when no body is provided.

---

## Alignment with course brief

- CSS framework: **Tailwind CSS v4** via npm (no CDN)
- Three+ pages styled with the framework: Intro, Feed, Profile, Login, Register, 404
- HTML form validation: register form uses `pattern`, `minlength`, `maxlength`, `title`
- Branch: `main`
- Production build deployed on Netlify
- Responsive: mobile drawer navbar, fluid type, `clamp()` headlines, full-screen modal drawers under 640px
- Accessible: focus rings, ARIA roles, screen-reader announcements, keyboard reachability for every action

---

## Acknowledgements

- **Noroff** for the Social API v2 and the FED2-24 course this project was built for.
- **Lucide** for the icon set.
- **Three.js** and **GSAP** for the 3D + motion work.

---

## License

MIT — see [LICENSE](./LICENSE).
