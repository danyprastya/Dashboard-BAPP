# Dashboard BAPP - Copilot Instructions

## Project Overview

Dashboard website untuk monitoring progress kontrak BAPP (Berita Acara Pemeriksaan Pekerjaan). Menampilkan data progress per customer, area, dan kontrak dalam format tabel dengan tracking bulanan. Mendukung admin CRUD untuk manajemen kontrak dan progress.

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
│   │   ├── header.tsx           # Top navigation with user menu
│   │   ├── filters.tsx          # Search & filter bar (year, customer, status)
│   │   ├── bapp-table.tsx       # Main data table (frozen columns)
│   │   ├── progress-dialog.tsx  # View progress detail modal
│   │   ├── edit-progress-dialog.tsx   # Admin: edit monthly progress
│   │   ├── contract-form-dialog.tsx   # Admin: create/edit contracts
│   │   └── dashboard-content.tsx      # Main dashboard container
│   └── providers/          # Context providers
├── lib/
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Browser client + isSupabaseConfigured()
│   │   ├── server.ts       # Server-side client
│   │   ├── middleware.ts   # Auth middleware client
│   │   └── data.ts         # All CRUD functions
│   ├── placeholder-data.ts # Mock data for dev mode
│   └── utils.ts            # shadcn utilities
├── types/
│   └── database.ts         # All TypeScript interfaces
└── middleware.ts           # Auth middleware
```

## Data Model

Hierarchical structure: **Customer → Area → Contract → Monthly Progress → Signatures**

Key types in `src/types/database.ts`:

- `CustomerWithAreas` - Top-level with nested areas
- `AreaWithContracts` - Area with nested contracts
- `ContractWithProgress` - Contract with 12 months of progress + dynamic signature count
- `MonthlyProgressDetail` - Individual signatures + upload status
- `SignatureDetail` - Individual signature status (name, role, is_completed)
- `ContractFormData` - Form data for creating/editing contracts

### Progress Calculation

```typescript
progress =
  ((completed_signatures + (upload_done ? 1 : 0)) / (total_signatures + 1)) *
  100;
```

Each contract has a **variable** number of signatures (2-5). The upload link counts as 1 additional item.

## Key Commands

```bash
npm run dev     # Dev server at localhost:3000
npm run build   # Production build
npm run lint    # ESLint check
```

## Admin Features

Logged-in users are treated as admins (for demo). Admin capabilities:

1. **Add Contract** - Button in header opens `ContractFormDialog`
2. **Edit Progress** - Pencil icon on hover opens `EditProgressDialog`
3. **CRUD Functions** in `src/lib/supabase/data.ts`:
   - `createContract(contractData, signatures)`
   - `updateContract(id, updates)`
   - `updateMonthlyProgress(contractId, month, year, uploadLink, isUploadCompleted, signatureStatuses)`
   - `deleteContract(id)`

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
- Data refresh triggered by `onProgressUpdate` callback

### Table Features

- Sticky header and frozen left columns (NO, CUSTOMER, contract name)
- Clickable progress cells → opens detail dialog
- Admin edit icon on progress cell hover
- Tooltip shows signature count breakdown
- Filters: year, customer, invoice type, status, search

## Placeholder Mode

When Supabase is not configured (`NEXT_PUBLIC_SUPABASE_URL` missing):

- Auth allows any email to "login"
- Data loads from `generatePlaceholderData(year)`
- Blue banner indicates demo mode
- Admin features visible but don't persist changes

## Environment Setup

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Schema (if using real database)

Required tables:

- `customers` (id, name, code, created_at)
- `areas` (id, customer_id, name, code, created_at)
- `bapp_contracts` (id, customer_id, area_id, name, period, invoice_type, notes, year, created_at)
- `signatures` (id, contract_id, name, role, order)
- `monthly_progress` (id, contract_id, month, year, upload_link, is_upload_completed, created_at, updated_at)
- `signature_progress` (id, monthly_progress_id, signature_id, is_completed, completed_at)
- `profiles` (id, email, full_name, role, created_at)

## Patterns to Follow

- Place new pages in `src/app/[route]/page.tsx`
- Create layouts as `layout.tsx` in route directories
- Keep components that need interactivity marked with `"use client"`
- Add UI components via `npx shadcn@latest add [component]`
- Extend database types in `src/types/database.ts`
- Keep Indonesian labels for UI text (JAN, FEB, etc.)
- Use `@/` path alias for all imports
- Use semantic color variables (`bg-background`, `text-foreground`) for theme consistency
- For Supabase operations, check `isSupabaseConfigured()` before making calls
