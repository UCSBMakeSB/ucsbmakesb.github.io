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

One-time setup:

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open SQL Editor, paste in `supabase/schema.sql`, and run it. This creates the `applications` table (locked down with row-level security) and the private `resumes` bucket.
3. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings -> API).
4. Add the same two variables in Vercel -> Project -> Settings -> Environment Variables, then redeploy.

View and export applications from the Supabase dashboard: Table Editor -> `applications` (CSV export is built in), and Storage -> `resumes` for files. The secret key bypasses row-level security, so keep it server-side only.

## Specifications

* Indentation: `2` space tabs
* Use the Prettier Code formatter, with the default JSX specifications

