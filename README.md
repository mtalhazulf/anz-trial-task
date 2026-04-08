# Voyager

A multi-tenant booking portal for travel agencies. Each agency is fully isolated from every other agency, enforced at the database layer with Postgres Row-Level Security — not in application code.

Built with Next.js 16 (App Router + React 19), Supabase (Postgres, Auth, Storage, Realtime), Tailwind CSS 4, and TypeScript.

> For the deeper architecture and security write-up, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Highlights

- **Multi-tenant by default.** Users can belong to multiple agencies and switch between them. Each agency has its own bookings, members, and ownership.
- **Database-enforced isolation.** All tenant data is gated by RLS policies that key off `auth.uid()` and a `user_has_agency_access()` security-definer helper. The Next.js layer cannot accidentally leak data across tenants — even a buggy query is denied by Postgres.
- **Server Actions for every mutation.** Creating agencies, switching the active agency, CRUD on bookings, and profile updates all run through typed Server Actions in [src/app/actions/](src/app/actions/). No client-side service-role keys; only the user's JWT is ever used.
- **Realtime bookings.** A Supabase Realtime channel subscribes to `postgres_changes` on the `bookings` table so the table updates the moment another member of the same agency makes a change.
- **Auth + profile sync.** A trigger on `auth.users` mirrors profile data into `public.users`, so the app can join against profiles without ever touching the auth schema directly.
- **Avatars in Supabase Storage.** A public `avatars` bucket with per-user folder policies — users can only write under their own `auth.uid()` prefix.
- **Polished UI.** Custom design tokens, animated collapsible sidebar, modal-driven forms, optimistic toasts, empty states, status badges, confirm dialogs.

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| UI | React 19, Tailwind CSS 4, lucide-react, react-hot-toast |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Auth | Supabase Auth via `@supabase/ssr` (cookie-based session) |
| Language | TypeScript |
| Package manager | Bun (npm / pnpm / yarn also work) |

---

## Getting started

### 1. Prerequisites

- [Bun](https://bun.sh) (or Node 20+ with npm/pnpm/yarn)
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Create a `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

You can find both values in **Supabase Dashboard → Project Settings → API**.

> Only the `anon` key is used. There is no service-role key in this app — every query runs with the user's JWT and is filtered by RLS.

### 4. Apply the database schema

Open the **SQL Editor** in your Supabase project and run [src/sql/schema.sql](src/sql/schema.sql). This creates:

- `public.users`, `public.agencies`, `public.agency_members`, `public.bookings`
- The `user_has_agency_access()` / `create_agency_for_user()` / `delete_agency_for_user()` security-definer functions
- A trigger on `auth.users` that mirrors profile data into `public.users`
- All RLS policies for tenant isolation
- The public `avatars` storage bucket and its per-user write policies
- Realtime publication on `bookings`

### 5. Run the dev server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create your first agency, and start adding bookings.

---

## Project layout

```
src/
├── app/
│   ├── actions/              # Server Actions (agency, booking, profile)
│   ├── auth/                 # Supabase auth callback route
│   ├── dashboard/            # Authenticated app shell + pages
│   ├── login/                # Sign-in / sign-up
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Marketing / redirect entry
├── components/               # All React components (sidebar, forms, modals, ...)
├── lib/
│   ├── agency/               # getDashboardAgencyContext + helpers
│   ├── auth/                 # Auth helpers used by server code
│   ├── hooks/                # Custom React hooks
│   ├── supabase/             # SSR + browser Supabase client factories
│   └── types.ts              # Shared TS types
├── middleware.ts             # Refreshes Supabase session cookies on every request
└── sql/
    └── schema.sql            # Single source of truth for the DB schema + RLS
```

---

## Data model

| Table | Purpose |
|---|---|
| `public.users` | Mirror of `auth.users` (kept in sync via trigger) so app code never has to query the auth schema. |
| `public.agencies` | Tenants. Each row is an agency / workspace. |
| `public.agency_members` | Join table mapping users to agencies with a role (`owner`, `admin`, `member`). |
| `public.bookings` | Tenant data. Every row belongs to exactly one agency. |

Every tenant table has RLS enabled. Reads and writes only succeed when `user_has_agency_access(agency_id)` returns true for the current `auth.uid()`. Owners are the only role allowed to delete an agency, enforced inside `delete_agency_for_user()`.

---

## How auth + tenancy fit together

1. User signs in → Supabase issues a JWT, stored in an httpOnly cookie by `@supabase/ssr`.
2. The Next.js [middleware](src/middleware.ts) refreshes the session cookie on every request.
3. `getDashboardAgencyContext()` ([src/lib/agency/server.ts](src/lib/agency/)) loads the current user's profile, the agencies they belong to, and the active agency (persisted in a cookie).
4. Server Components and Server Actions use a server-side Supabase client built from those cookies — every query runs with the user's JWT, so RLS naturally restricts results.
5. The browser uses a separate Supabase client (anon key + same cookie session) to subscribe to `postgres_changes` for live booking updates. Realtime authorization also flows through RLS.

---

## Scripts

```bash
bun run dev      # Start the dev server
bun run build    # Production build
bun run start    # Start the production server
bun run lint     # ESLint
```

---

## Security notes

- **No service-role key on the client or in app code.** The only Supabase key used at runtime is `NEXT_PUBLIC_SUPABASE_ANON_KEY`. All authority comes from RLS + the user's JWT.
- **Defense in depth.** Even if a Server Action forgot to scope a query by `agency_id`, the database would still reject rows the user shouldn't see.
- **Security-definer helpers** (`user_has_agency_access`, `create_agency_for_user`, `delete_agency_for_user`) all explicitly `SET search_path = public` to avoid search-path hijacking.
- **Storage policies** restrict avatar uploads to a folder named after the user's `auth.uid()`, so users cannot overwrite each other's files.

For the full threat model and policy breakdown, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## License

This project was built as a trial task. Use it as a reference, fork it, learn from it.
