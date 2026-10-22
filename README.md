# MakeSB 2027 website

A responsive Next.js App Router website for MakeSB at UC Santa Barbara, taking place January 16–17, 2027.

Install dependencies and start the development server:

```sh
npm install
npm run dev
```

Then visit `http://localhost:3000`.

Build the production site and run the checks:

```sh
npm run build
npm test
```

The page is rendered from `app/page.jsx`, shared metadata is in `app/layout.jsx`, and static assets are served from `public/assets`. 
