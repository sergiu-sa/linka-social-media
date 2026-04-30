# LINKA — Social Media Platform

A responsive social media SPA built with TypeScript, Vite, Tailwind CSS v4, and the Noroff Social API v2. Designed for portfolio: editorial-flat aesthetic, single orange accent, distinctive 3D intro, accessible interactions throughout.

**Final submission for Noroff FED2-24 CSS Frameworks Course Assignment.**

## Live project

- **Production:** <https://linka-social.netlify.app/>
- **API base URL:** `https://v2.api.noroff.dev`

## Features

### Authentication
- Registration requires a `@stud.noroff.no` email address
- JWT-based login persisted to `localStorage`
- Client-side `pattern` validation on the username field
- Logged-in users hitting any auth route are redirected to `/feed`; unauthenticated users hitting protected routes are redirected to `/`

### Feed & posts
- Editorial single-column feed with inline post expansion
- Composer with optional tags, image URL, and image alt text
- Pagination (prev / page numbers / next, plus a "jump to" input on long ranges)
- Real-time search across posts and authors (falls back to public sample posts for guests)

### Post interactions
- Emoji reactions (like + extended picker) with optimistic UI
- Threaded comments and replies, fetched on-demand from the API
- Owner-only edit/delete with focus-trapped confirmation modal

### Navigation & UX
- Editorial-flat top navbar with text-only links and orange-underline active state
- Custom 404 with single Bebas Neue display
- Loading overlay branded with the LINKA mark
- Toast notifications with `role="status"` / `role="alert"` for screen readers
- `prefers-reduced-motion` honoured throughout

### Accessibility
- Reaction picker reachable via keyboard (Tab opens it; Tab cycles emoji)
- Author rows are `role="button"` with Enter/Space support
- All destructive confirmations use a focus-trapped modal (ESC cancels, focus returns to trigger)
- Single global theme system: toggling theme on any page propagates via the `linka-theme-changed` event

## Tech stack

- **Language:** TypeScript (strict)
- **Bundler:** Vite
- **CSS:** Tailwind CSS v4 (`@tailwindcss/vite`, no `tailwind.config.js`) + scoped custom CSS in `src/style.css`
- **Fonts:** `@fontsource/bebas-neue` (display) + `@fontsource/open-sans` (body)
- **Icons:** Font Awesome Free
- **3D / motion:** Three.js + GSAP (intro page only)
- **API:** Noroff Social API v2
- **Tests:** Vitest + jsdom
- **Formatter:** Prettier
- **Deployment:** Netlify

## Quick start

### Prerequisites
- Node.js v18+
- npm
- A Noroff `@stud.noroff.no` account

### Install

```bash
git clone https://github.com/R3N8/social_platform.git
cd social_platform
npm install
cp .env.example .env
```

### Environment variables

Only one variable is needed:

```bash
VITE_API_URL=https://v2.api.noroff.dev
```

If `VITE_API_URL` is not set, the app falls back to the production Noroff API.

### Development

```bash
npm run dev
```

Open <http://localhost:5173>.

### Build

```bash
npm run build
npm run preview
```

### Tests

```bash
npm test        # watch mode
npx vitest run  # one-shot
```

Smoke tests live next to the source they cover (`src/utils/date.test.ts`, `src/utils/storage.test.ts`).

## Project structure

```text
src/
├── components/         # Reusable UI (postCard + delegated event handler)
├── pages/              # Intro, Login, Register, Feed, Profile, Navbar, 404, Loading
│   └── auth/           # Shared editorial split-screen shell
├── services/
│   ├── api/            # HTTP client (apiClient + authPost)
│   ├── auth/           # Login/register form submit handler
│   ├── error/          # ApiError class
│   ├── posts/          # Posts CRUD + comments fetch
│   └── interactions/   # Comments + reactions
├── router/             # Custom SPA router with auth-gated redirects
├── types/              # TypeScript definitions (incl. unified Window globals)
├── utils/
│   ├── auth.ts         # isLoggedIn / logout / token helpers
│   ├── confirm.ts      # Focus-trapped Promise-based confirm dialog
│   ├── date.ts         # getTimeAgo (covered by tests)
│   ├── log.ts          # Dev-only console wrapper (no-op in production)
│   ├── storage.ts      # localStorage shim (covered by tests)
│   └── theme.ts        # Single source of truth for light/dark theme
├── constant.ts         # API_URL + APP_CONTAINER_CLASSNAME
├── main.ts             # Application entry point
└── style.css           # Tailwind + all custom CSS (sectioned)
```

## Alignment with course brief

- CSS Framework: **Tailwind CSS v4** via npm (no CDN)
- Three+ pages styled with the framework: Intro, Feed, Profile, plus Login/Register/Profile/404
- HTML validation on a form: register form (`pattern`, `minlength`, `maxlength`, `title`)
- Branch: `main`
- Production build deployed on Netlify
- Responsive: mobile drawer navbar, fluid type, `clamp()` headlines
- Accessible: focus rings, ARIA roles, screen-reader announcements, keyboard reachability for every action

## Team

- Muhammad Hammad Khan (@Hammadniazi)
- Renate Pedersen (@03-renate)
- Sergiu Sarbu (@sergiu-sa)

## License

Educational use — Noroff FED2-24 Front-End Development program.
