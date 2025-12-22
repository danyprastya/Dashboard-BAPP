# Panduan Setup Supabase untuk Dashboard BAPP

## 1. Jalankan Schema Database

Buka **SQL Editor** di Supabase Dashboard, lalu jalankan isi file `supabase/schema.sql`.

Schema ini akan membuat tabel-tabel berikut:

- `customers` - Data customer
- `areas` - Area per customer
- `bapp_contracts` - Kontrak BAPP
- `signatures` - Tanda tangan yang diperlukan per kontrak
- `monthly_progress` - Progress bulanan (JAN-DES)
- `signature_progress` - Status setiap tanda tangan per bulan
- `profiles` - Profil user

## 2. Setup Row Level Security (RLS)

Jalankan SQL berikut di **SQL Editor** untuk mengatur policy RLS:

```sql
-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bapp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (untuk menghindari duplikat)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON areas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bapp_contracts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON signatures;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON monthly_progress;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON signature_progress;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- CUSTOMERS: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON customers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- AREAS: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON areas
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- BAPP_CONTRACTS: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON bapp_contracts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- SIGNATURES: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON signatures
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- MONTHLY_PROGRESS: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON monthly_progress
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- SIGNATURE_PROGRESS: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON signature_progress
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- PROFILES: Users can read all profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- PROFILES: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- PROFILES: Allow insert for auth trigger
CREATE POLICY "Enable insert for authenticated users only" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow service role to insert profiles (for auth trigger)
CREATE POLICY "Service role can insert profiles" ON profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);
```

## 3. Setup Auth Trigger untuk Profile Otomatis

Jalankan SQL ini untuk membuat profile otomatis saat user mendaftar:

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        'user'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

## 4. Cek Constraint Invoice Type

Database memiliki constraint untuk kolom `invoice_type`. Nilai yang valid adalah:

- `Pusat`
- `Regional 2`
- `Regional 3`

Form sudah diupdate untuk menggunakan dropdown dengan pilihan ini.

## 5. Environment Variables

Pastikan file `.env.local` berisi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Atau gunakan nama alternatif:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
```

## 6. Test Koneksi

1. Jalankan `npm run dev`
2. Buka http://localhost:3000
3. Login dengan email yang terdaftar di Supabase Auth
4. Coba tambah kontrak baru

## Troubleshooting

### Error: "new row for relation violates check constraint"

- Pastikan `invoice_type` adalah salah satu dari: `Pusat`, `Regional 2`, `Regional 3`
- Form sudah diupdate dengan dropdown yang hanya mengizinkan nilai valid

### Error: "invalid input syntax for type uuid"

- Customer dan Area sekarang diinput sebagai nama (text), bukan UUID
- Sistem akan otomatis mencari atau membuat customer/area berdasarkan nama

### Error: "Database error saving new user"

- Jalankan script Auth Trigger di langkah 3
- Pastikan RLS policy untuk `profiles` sudah benar

### Data masih placeholder

- Cek environment variables sudah benar
- Pastikan user sudah login (authenticated)
- Lihat console browser untuk error detail

## Struktur Tabel

```
customers
├── id (UUID, PK)
├── name (VARCHAR, UNIQUE)
├── created_at
└── updated_at

areas
├── id (UUID, PK)
├── customer_id (FK → customers)
├── name (VARCHAR)
├── code (VARCHAR)
├── created_at
└── updated_at

bapp_contracts
├── id (UUID, PK)
├── customer_id (FK → customers)
├── area_id (FK → areas)
├── name (VARCHAR)
├── period (VARCHAR)
├── invoice_type (VARCHAR) ← CHECK: 'Pusat', 'Regional 2', 'Regional 3'
├── notes (TEXT)
├── year (INTEGER)
├── created_at
└── updated_at

signatures
├── id (UUID, PK)
├── contract_id (FK → bapp_contracts)
├── name (VARCHAR)
├── role (VARCHAR)
├── order (INTEGER)
└── created_at

monthly_progress
├── id (UUID, PK)
├── contract_id (FK → bapp_contracts)
├── month (INTEGER) ← CHECK: 1-12
├── year (INTEGER)
├── upload_link (TEXT)
├── is_upload_completed (BOOLEAN)
├── created_at
└── updated_at

signature_progress
├── id (UUID, PK)
├── monthly_progress_id (FK → monthly_progress)
├── signature_id (FK → signatures)
├── is_completed (BOOLEAN)
└── completed_at

profiles
├── id (UUID, PK, FK → auth.users)
├── email (VARCHAR, UNIQUE)
├── full_name (VARCHAR)
├── role (VARCHAR) ← 'admin' atau 'user'
├── created_at
└── updated_at
```

## 7. Menambahkan User yang Diizinkan Akses

Dashboard ini menggunakan **whitelist email** - hanya user dengan email yang terdaftar di tabel `profiles` yang bisa mengakses `/dashboard`.

### Cara 1: Via Supabase Dashboard (Recommended)

1. Buka **Supabase Dashboard** → **Authentication** → **Users**
2. Klik **"Add user"** → **"Create new user"**
3. Masukkan email dan password
4. User akan otomatis ditambahkan ke tabel `profiles` via trigger

### Cara 2: Via SQL Editor

```sql
-- Tambahkan user langsung ke profiles (untuk user yang sudah ada di auth.users)
INSERT INTO profiles (id, email, full_name, role)
VALUES
    ('user-uuid-from-auth', 'user@example.com', 'Nama User', 'admin');

-- Atau untuk multiple users sekaligus
INSERT INTO profiles (id, email, full_name, role)
VALUES
    (gen_random_uuid(), 'admin@company.com', 'Admin User', 'admin'),
    (gen_random_uuid(), 'staff1@company.com', 'Staff 1', 'user'),
    (gen_random_uuid(), 'staff2@company.com', 'Staff 2', 'user');
```

### Cara 3: Invite User via Supabase

1. Buka **Authentication** → **Users**
2. Klik **"Invite user"**
3. Masukkan email yang ingin diundang
4. User akan menerima email undangan untuk set password

### Catatan Penting

- **Hanya email yang ada di tabel `profiles` yang bisa akses dashboard**
- User yang login tapi email-nya tidak ada di `profiles` akan di-redirect ke halaman login dengan pesan error
- Trigger `handle_new_user` otomatis membuat entry di `profiles` saat user baru mendaftar via Auth
