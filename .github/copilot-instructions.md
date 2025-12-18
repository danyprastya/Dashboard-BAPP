# Dashboard BAPP - Copilot Instructions

## Project Overview

Dashboard website untuk monitoring progress kontrak BAPP (Berita Acara Pemeriksaan Pekerjaan). Menampilkan data progress per customer, area, dan kontrak dalam format tabel dengan tracking bulanan.

## Tech Stack

- **Framework**: Next.js 16.0.10 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Auth & DB**: Supabase (with placeholder mode for development)
- **Icons**: Lucide React
- **Language**: TypeScript 5 (strict mode)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Redirects to /login
│   ├── login/page.tsx      # Login page
│   ├── dashboard/page.tsx  # Main dashboard
│   └── auth/callback/      # Supabase auth callback
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── auth/               # Login form
│   ├── dashboard/          # Dashboard components
│   │   ├── header.tsx      # Top navigation
│   │   ├── filters.tsx     # Search & filter bar
│   │   ├── bapp-table.tsx  # Main data table (frozen columns)
│   │   ├── progress-dialog.tsx  # Progress detail modal
│   │   └── dashboard-content.tsx
│   └── providers/          # Context providers
├── lib/
│   ├── supabase/           # Supabase clients (client, server, middleware)
│   ├── placeholder-data.ts # Mock data for dev mode
│   └── utils.ts            # shadcn utilities
├── types/
│   └── database.ts         # All TypeScript interfaces
└── middleware.ts           # Auth middleware
```

## Data Model

Hierarchical structure: **Customer → Area → Contract → Monthly Progress**

Key types in `src/types/database.ts`:

- `CustomerWithAreas` - Top-level with nested areas
- `ContractWithProgress` - Contract with 12 months of progress
- `MonthlyProgressDetail` - Signatures + upload status = percentage

Progress calculation: `(completed_signatures + upload_done) / (total_signatures + 1) * 100`

## Key Commands

```bash
npm run dev     # Dev server at localhost:3000
npm run build   # Production build
npm run lint    # ESLint check
```

## Coding Conventions

### Components

- Use `"use client"` only for interactive components
- All dashboard components are client-side (filters, table interactions)
- Use shadcn/ui components from `@/components/ui/`

### Styling

- Tailwind CSS v4 with `@import "tailwindcss"` syntax
- Color scheme: neutral base + soft progress colors (emerald, teal, amber, orange, rose)
- Progress colors defined in `getProgressColorClass()` in `placeholder-data.ts`
- Dark mode supported via `dark:` variants

### State Management

- Auth state via `AuthProvider` context
- Dashboard filters via local `useState`
- Data fetching simulated with placeholder (ready for Supabase)

### Table Features

- Sticky header and left columns (NO, CUSTOMER, contract name)
- Clickable progress cells → opens detail dialog
- Filters: year, customer, invoice type, status, search

## Placeholder Mode

When Supabase is not configured (`NEXT_PUBLIC_SUPABASE_URL` missing):

- Auth allows any email to "login"
- Data loads from `generatePlaceholderData()`
- Blue banner indicates demo mode

## Environment Setup

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Patterns to Follow

- Place new pages in `src/app/[route]/page.tsx`
- Create layouts as `layout.tsx` in route directories
- Keep components that need interactivity marked with `"use client"`
- Add UI components via `npx shadcn@latest add [component]`
- Extend database types in `src/types/database.ts`
- Keep Indonesian labels for UI text (JAN, FEB, etc.)
- Use `@/` path alias for all imports
- Use semantic color variables (`bg-background`, `text-foreground`) for theme consistency
