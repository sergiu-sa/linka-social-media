# LINKA – Social Media Platform

A modern, responsive social media application built with TypeScript, Vite, Tailwind CSS v4, and the Noroff Social API v2.  
This project demonstrates contemporary web development practices: CSS framework integration, authenticated API consumption, CRUD operations, modular architecture, and production-ready deployment.

**Final submission for Noroff FED2-24 CSS Frameworks Course Assignment.**

## Live Project & Repository

**Production Deploy:** [https://linka-social.netlify.app/](https://linka-social.netlify.app/)  
**API Base URL:** [https://v2.api.noroff.dev/social/posts](https://v2.api.noroff.dev/social/posts)

## Features

### Authentication

- User registration requiring a `@stud.noroff.no` email address  
- JWT-based login and secure local storage  
- Client-side validation and helpful error messages  
- Auto-redirects based on login status  

### Feed & Posts

- Interactive post cards with click-to-view details  
- Real-time search (users, posts, hashtags)  
- Pagination with next/previous navigation  
- Responsive grid layout  
- Sample demo posts for guests  

### Post Management

- Create, edit, delete posts  
- View posts of other users  
- Full single post display with author details  

### Post Interactions

- Emoji reactions with hover modal  
- Comment system (view and create comments)  
- Reply to comments  
- Share functionality (native + clipboard fallback)  
- Media support (responsive images)  
- Hashtags with styling indicators  

### Navigation & UX

- Custom client-side routing  
- Responsive navbar with search  
- Custom animated 404 page  
- Loading states and error handling  

## Tech Stack

- **Frontend:** TypeScript (Vite)
- **CSS Framework:** Tailwind CSS v4 (via npm, @tailwindcss/vite)
- **Fonts:** @fontsource (Bebas Neue, Open Sans)
- **Icons:** Font Awesome Free (via npm)
- **3D Graphics:** Three.js + GSAP
- **API:** Noroff Social API v2
- **Authentication:** JWT + Local Storage
- **Routing:** Custom client-side router
- **Testing:** Vitest
- **Code Formatting:** Prettier
- **Deployment:** Netlify
- **3D Graphics:** Three.js + GSAP

## Quick Start

### Prerequisites

- Node.js v16+
- npm or yarn
- Noroff @stud.noroff.no account

### Installation

```bash
git clone https://github.com/R3N8/social_platform.git
cd social_platform
npm install
cp .env.example .env
```

Edit `.env` with your configuration.

### Environment Variables

Create a `.env` file with:

```bash

VITE_API_BASE_URL=https://v2.api.noroff.dev/social
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```md
src/
├── components/        # Reusable UI
├── pages/             # Login, Register, Feed, Profile, SinglePost, 404
├── services/          # API and business logic
│   ├── api/           # HTTP client
│   ├── auth/          # Authentication utils
│   ├── posts/         # Posts API integration
│   └── interactions/  # Comments & reactions
├── router/            # Client-side routing
├── types/             # TypeScript definitions
├── utils/             # Helpers (auth, storage, ui, validators)
├── constant.ts        # App constants
├── main.ts            # Application entry point
└── style.css          # Global styles
```

## Alignment with Course Brief

- CSS Framework used: **Tailwind CSS v4** installed via npm (no CDN)  
- At least **three pages** styled with the framework: IntroAuth, Feed, Profile  
- One page includes **HTML validation** on a form (Register form)  
- Work completed in branch: `css-frameworks`  
- Deployed production build (Netlify) using Vite configuration  
- Responsive and accessible: focus states, semantic labels, and adaptive layout  

## Team & Contributions

- Muhammad Hammad Khan (@Hammadniazi)  
- Renate Pedersen (@03-renate)  
- Sergiu Sarbu (@sergiu-sa)

## Acknowledgments

- **Noroff API v2** for backend services  
- **Tailwind CSS** for the utility-first CSS framework  
- **Vite** for the fast dev environment  
- **Three.js & GSAP** for interactive 3D graphics  
- **Font Awesome** for iconography  
- **Netlify** for deployment and hosting  
- **Monde Sineke** ([S3ak](https://github.com/S3ak)) – instructor guidance and starter template  

## License

This project is for educational purposes as part of the **Noroff FED2-24 Front-End Development** program.
