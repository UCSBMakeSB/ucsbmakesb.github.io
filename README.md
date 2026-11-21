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

## Application backend (Supabase)

The `/apply` form posts to `app/api/apply/route.js`, which validates the submission (`lib/application-validation.js`), saves it to Supabase, and stores the resume in a private bucket. Resumes are capped at 4 MB because Vercel rejects larger request bodies.

For local development, you can use the `dev` branch on Supabase. If you work directly on the `dev` branch, this should work fine. If you work on a feature branch, you will need to create a new branch on Supabase and update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables in `.env.local` to point to your branch.

## Specifications

- Indentation: `2` space tabs
- Use the Prettier Code formatter, with the default JSX specifications

## Rules

Refer to [docs/rules.md](docs/rules.md) for organizational rules and best practices. ALWAYS follow these rules when working on the project. If you are unsure about a rule, ask for clarification before proceeding.
