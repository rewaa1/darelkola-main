# Project Setup Guide

## Prerequisites

- **Node.js**: v20 or later
- **pnpm**: v8 or later (`npm install -g pnpm`)
- **Supabase Account**: Create at [supabase.com](https://supabase.com)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and set:
   - **Name**: `darelkola`
   - **Database Password**: (save this securely)
   - **Region**: Choose closest (e.g., Frankfurt for Egypt)
4. Wait for project creation (~2 minutes)

### Get Credentials

From Project Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

From Project Settings → Database:

- `DATABASE_URL` (Connection string → URI format)

---

## Step 2: Install Dependencies

```bash
cd c:\dev\Darelkola\darelkola

# Core dependencies
pnpm add @supabase/supabase-js @supabase/ssr

# Database
pnpm add prisma @prisma/client
pnpm add -D prisma

# UI Components
pnpm add class-variance-authority clsx tailwind-merge
pnpm add lucide-react
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
pnpm add @radix-ui/react-select @radix-ui/react-label

# Forms & Validation
pnpm add react-hook-form @hookform/resolvers zod

# Data Fetching
pnpm add @tanstack/react-query

# Internationalization
pnpm add next-intl

# File Upload
pnpm add react-dropzone

# PDF Generation
pnpm add @react-pdf/renderer

# Date Handling
pnpm add date-fns
```

---

## Step 3: Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Prisma)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

---

## Step 4: Initialize Prisma

```bash
# Initialize Prisma
pnpm prisma init

# This creates:
# - prisma/schema.prisma
# - .env (if not exists)
```

Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Copy models from 02-DATABASE-SCHEMA.md
```

Run migrations:

```bash
# Create and apply initial migration
pnpm prisma migrate dev --name init

# Generate Prisma Client
pnpm prisma generate
```

---

## Step 5: Project Structure

Create the following directory structure:

```bash
# Create directories
mkdir -p src/app/[locale]/(auth)/login
mkdir -p src/app/[locale]/(dashboard)/patients
mkdir -p src/app/[locale]/(dashboard)/appointments
mkdir -p src/app/[locale]/(dashboard)/queue
mkdir -p src/app/api

mkdir -p src/components/ui
mkdir -p src/components/patients
mkdir -p src/components/appointments
mkdir -p src/components/prescriptions
mkdir -p src/components/uploads

mkdir -p src/lib/supabase
mkdir -p src/lib/prisma
mkdir -p src/lib/utils

mkdir -p src/hooks

mkdir -p src/i18n
mkdir -p src/messages

mkdir -p src/types
```

---

## Step 6: Setup Supabase Clients

### Browser Client

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### Server Client

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server component read-only context
          }
        },
      },
    },
  );
}
```

### Prisma Client

```typescript
// src/lib/prisma/index.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## Step 7: Setup next-intl

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

Update `next.config.ts`:

```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {};

export default withNextIntl(nextConfig);
```

---

## Step 8: Setup shadcn/ui

```bash
pnpm dlx shadcn-ui@latest init
```

When prompted:

- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**
- Tailwind config: **tailwind.config.ts**
- Components location: **src/components/ui**
- Utils location: **src/lib/utils**
- React Server Components: **Yes**

Add common components:

```bash
pnpm dlx shadcn-ui@latest add button card dialog dropdown-menu input label select tabs
```

---

## Step 9: Setup Supabase Storage

1. Go to Supabase Dashboard → Storage
2. Create bucket: `clinic-files`
   - Public: **No**
   - File size limit: **10MB**
3. Add RLS policies (see 07-FILE-UPLOADS.md)

---

## Step 10: Create Database Trigger

In Supabase Dashboard → SQL Editor, run:

```sql
-- Sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, clinic_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST'),
    NEW.raw_user_meta_data->>'clinic_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Step 11: Seed Initial Data

Create seed script:

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create clinics
  const clinic1 = await prisma.clinic.create({
    data: {
      name: "Darelkola - Branch 1",
      nameAr: "دار الكلى - فرع ١",
      address: "Cairo, Egypt",
      phone: "0100000001",
    },
  });

  const clinic2 = await prisma.clinic.create({
    data: {
      name: "Darelkola - Branch 2",
      nameAr: "دار الكلى - فرع ٢",
      address: "Giza, Egypt",
      phone: "0100000002",
    },
  });

  console.log("Seeded clinics:", { clinic1, clinic2 });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run:

```bash
pnpm add -D ts-node
pnpm prisma db seed
```

---

## Step 12: Run Development Server

```bash
pnpm dev
```

Visit: [http://localhost:3000/ar](http://localhost:3000/ar)

---

## Next Steps

1. Create the locale layout (`src/app/[locale]/layout.tsx`)
2. Implement login page
3. Create middleware for auth protection
4. Build dashboard layout
5. Implement patient registration
6. Build appointment booking
7. Implement queue system
8. Add prescription management
