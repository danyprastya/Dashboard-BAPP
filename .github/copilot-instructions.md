# Dashboard BAPP - Copilot Instructions

## Overview

BAPP (Berita Acara Pemeriksaan Pekerjaan) progress monitoring dashboard. Tracks contract progress by customer/area with monthly signature tracking. Supports dual-mode: Supabase (production) or placeholder data (development).

## Architecture

**Data Hierarchy**: Customer → Area → Contract → MonthlyProgress → SignatureProgress

```
src/
├── app/              # Next.js 16 App Router pages
├── components/
│   ├── ui/           # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── dashboard/    # Business logic components
│   └── providers/    # AuthProvider context
├── lib/
│   ├── supabase/     # client.ts, server.ts, data.ts (all CRUD)
│   ├── toast.ts      # showSuccessToast(), showErrorToast()
│   └── error-translator.ts  # DB errors → Indonesian messages
└── types/database.ts # All interfaces + MONTH_NAMES constants
```

## Critical Patterns

### Dual-Mode Data Layer
Always check Supabase availability before DB operations:
```typescript
import { isSupabaseConfigured } from "@/lib/supabase/client";

if (isSupabaseConfigured()) {
  // Use fetchDashboardData() from lib/supabase/data.ts
} else {
  // Use generatePlaceholderData() from lib/placeholder-data.ts
}
```

### Progress Calculation Formula
Each contract has **variable signatures (2-5)** + 1 upload item:
```typescript
progress = ((completed_signatures + (upload_done ? 1 : 0)) / (total_signatures + 1)) * 100;
```
Use `calculateProgress()` from `types/database.ts` for consistency.

### Error Handling Pattern
Use the error translation system for user-facing errors:
```typescript
import { showErrorToast, showSuccessToast } from "@/lib/toast";

try {
  await updateContract(id, data);
  showSuccessToast("Kontrak berhasil diperbarui");
} catch (error) {
  showErrorToast(error, "Gagal memperbarui kontrak"); // Auto-translates DB errors
}
```

### Client vs Server Components
- Mark interactive components with `"use client"` (all dashboard/* components)
- Auth state via `useAuth()` hook from `components/providers/auth-provider.tsx`
- Data refresh via `onProgressUpdate` callback prop pattern

## Key CRUD Functions (lib/supabase/data.ts)
- `fetchDashboardData(year)` - Main data fetch with nested joins
- `createContract(data, signatures)` - Creates contract + signatures atomically
- `updateMonthlyProgress(contractId, month, year, uploadLink, isUploadCompleted, signatureStatuses)`
- `deleteContract(id)` - Cascades to signatures/progress

## Conventions

### UI/Styling
- Use shadcn/ui: `npx shadcn@latest add [component]`
- Tailwind CSS v4 with semantic colors: `bg-background`, `text-foreground`
- Progress colors: `getProgressColorClass()` in `placeholder-data.ts`
- Icons: Lucide React only

### TypeScript
- All types in `src/types/database.ts`
- Strict mode enabled
- Use `@/` path alias for imports

### Localization
- UI text in Indonesian (JAN, FEB, etc. via `MONTH_NAMES`)
- Error messages translated via `error-translator.ts`
- Invoice types: "Pusat" | "Regional 2" | "Regional 3"

## Commands
```bash
npm run dev     # localhost:3000
npm run build   # Production build  
npm run lint    # ESLint
```

## Environment
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
```
Missing vars → placeholder mode (demo data, any email login works)
