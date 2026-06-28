# Internationalization (i18n) Design

## Overview

Full bilingual support for Arabic and English using `next-intl`, with RTL layout support.

---

## Technology

| Package      | Purpose                                     |
| ------------ | ------------------------------------------- |
| `next-intl`  | Internationalization for Next.js App Router |
| Tailwind CSS | RTL support via `dir` attribute             |

---

## Folder Structure

```
src/
├── app/
│   ├── [locale]/           # All routes are locale-prefixed
│   │   ├── layout.tsx      # Applies locale context
│   │   ├── page.tsx
│   │   └── ...
│   └── layout.tsx          # Root layout
├── i18n/
│   ├── request.ts          # Server-side locale handling
│   └── routing.ts          # Routing config
└── messages/
    ├── ar.json             # Arabic translations
    └── en.json             # English translations
```

---

## Setup

### 1. Install Dependencies

```bash
pnpm add next-intl
```

### 2. Routing Configuration

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar", // Arabic as default (clinic is in Egypt)
  localePrefix: "always",
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

### 3. Request Configuration

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

### 4. Middleware

```typescript
// src/middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(ar|en)/:path*"],
};
```

### 5. Root Layout

```typescript
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  setRequestLocale(locale)
  const messages = await getMessages()

  const isRTL = locale === 'ar'

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

---

## Translation Files

### Arabic (ar.json)

```json
{
  "common": {
    "appName": "دار الكلى",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "search": "بحث",
    "loading": "جاري التحميل...",
    "noResults": "لا توجد نتائج",
    "required": "مطلوب"
  },

  "auth": {
    "login": "تسجيل الدخول",
    "logout": "تسجيل الخروج",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "forgotPassword": "نسيت كلمة المرور؟"
  },

  "nav": {
    "dashboard": "لوحة التحكم",
    "patients": "المرضى",
    "appointments": "المواعيد",
    "queue": "قائمة الانتظار",
    "settings": "الإعدادات"
  },

  "patients": {
    "title": "المرضى",
    "newPatient": "مريض جديد",
    "searchPlaceholder": "البحث بالاسم أو رقم الهاتف...",
    "personalInfo": "المعلومات الشخصية",
    "medicalHistory": "التاريخ المرضي",
    "sessions": "الجلسات",
    "prescriptions": "الوصفات الطبية",
    "investigations": "الفحوصات"
  },

  "personalHistory": {
    "fullName": "الاسم الكامل",
    "phoneNumber": "رقم الهاتف",
    "dateOfBirth": "تاريخ الميلاد",
    "age": "العمر",
    "sex": "الجنس",
    "male": "ذكر",
    "female": "أنثى",
    "maritalStatus": "الحالة الاجتماعية",
    "single": "أعزب",
    "married": "متزوج",
    "divorced": "مطلق",
    "widowed": "أرمل",
    "offsprings": "عدد الأبناء",
    "occupation": "المهنة",
    "residence": "محل الإقامة"
  },

  "appointments": {
    "title": "المواعيد",
    "bookNew": "حجز موعد جديد",
    "todayAppointments": "مواعيد اليوم",
    "scheduled": "محجوز",
    "arrived": "وصل",
    "inSession": "في الجلسة",
    "completed": "مكتمل",
    "noShow": "لم يحضر",
    "cancelled": "ملغي",
    "checkIn": "تسجيل الوصول",
    "callNext": "استدعاء التالي"
  },

  "queue": {
    "title": "قائمة الانتظار",
    "currentPatient": "المريض الحالي",
    "waitingList": "قائمة الانتظار",
    "noWaiting": "لا يوجد مرضى في الانتظار",
    "queueNumber": "رقم"
  },

  "prescriptions": {
    "title": "الوصفات الطبية",
    "newPrescription": "وصفة جديدة",
    "activeMedications": "الأدوية الحالية",
    "medication": "الدواء",
    "type": "النوع",
    "dosage": "الجرعة",
    "frequency": "التكرار",
    "duration": "المدة",
    "startDate": "تاريخ البداية",
    "print": "طباعة"
  },

  "medicationTypes": {
    "tablet": "أقراص",
    "capsule": "كبسولات",
    "syrup": "شراب",
    "injection": "حقن",
    "cream": "كريم",
    "drops": "قطرات",
    "inhaler": "بخاخ"
  },

  "frequency": {
    "once_daily": "مرة يومياً",
    "twice_daily": "مرتين يومياً",
    "three_times": "ثلاث مرات يومياً",
    "four_times": "أربع مرات يومياً",
    "as_needed": "عند الحاجة",
    "weekly": "أسبوعياً"
  },

  "investigations": {
    "title": "الفحوصات",
    "addNew": "إضافة فحص",
    "date": "التاريخ",
    "type": "النوع",
    "report": "التقرير",
    "images": "الصور"
  },

  "errors": {
    "required": "هذا الحقل مطلوب",
    "invalidPhone": "رقم هاتف غير صحيح",
    "loginFailed": "فشل تسجيل الدخول"
  }
}
```

### English (en.json)

```json
{
  "common": {
    "appName": "Darelkola",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "loading": "Loading...",
    "noResults": "No results",
    "required": "Required"
  },

  "auth": {
    "login": "Login",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?"
  },

  "nav": {
    "dashboard": "Dashboard",
    "patients": "Patients",
    "appointments": "Appointments",
    "queue": "Queue",
    "settings": "Settings"
  },

  "patients": {
    "title": "Patients",
    "newPatient": "New Patient",
    "searchPlaceholder": "Search by name or phone...",
    "personalInfo": "Personal Information",
    "medicalHistory": "Medical History",
    "sessions": "Sessions",
    "prescriptions": "Prescriptions",
    "investigations": "Investigations"
  },

  "personalHistory": {
    "fullName": "Full Name",
    "phoneNumber": "Phone Number",
    "dateOfBirth": "Date of Birth",
    "age": "Age",
    "sex": "Sex",
    "male": "Male",
    "female": "Female",
    "maritalStatus": "Marital Status",
    "single": "Single",
    "married": "Married",
    "divorced": "Divorced",
    "widowed": "Widowed",
    "offsprings": "Offsprings",
    "occupation": "Occupation",
    "residence": "Residence"
  },

  "appointments": {
    "title": "Appointments",
    "bookNew": "Book Appointment",
    "todayAppointments": "Today's Appointments",
    "scheduled": "Scheduled",
    "arrived": "Arrived",
    "inSession": "In Session",
    "completed": "Completed",
    "noShow": "No Show",
    "cancelled": "Cancelled",
    "checkIn": "Check In",
    "callNext": "Call Next"
  },

  "queue": {
    "title": "Patient Queue",
    "currentPatient": "Current Patient",
    "waitingList": "Waiting List",
    "noWaiting": "No patients waiting",
    "queueNumber": "#"
  },

  "prescriptions": {
    "title": "Prescriptions",
    "newPrescription": "New Prescription",
    "activeMedications": "Active Medications",
    "medication": "Medication",
    "type": "Type",
    "dosage": "Dosage",
    "frequency": "Frequency",
    "duration": "Duration",
    "startDate": "Start Date",
    "print": "Print"
  },

  "medicationTypes": {
    "tablet": "Tablet",
    "capsule": "Capsule",
    "syrup": "Syrup",
    "injection": "Injection",
    "cream": "Cream",
    "drops": "Drops",
    "inhaler": "Inhaler"
  },

  "frequency": {
    "once_daily": "Once daily",
    "twice_daily": "Twice daily",
    "three_times": "Three times daily",
    "four_times": "Four times daily",
    "as_needed": "As needed",
    "weekly": "Weekly"
  },

  "investigations": {
    "title": "Investigations",
    "addNew": "Add Investigation",
    "date": "Date",
    "type": "Type",
    "report": "Report",
    "images": "Images"
  },

  "errors": {
    "required": "This field is required",
    "invalidPhone": "Invalid phone number",
    "loginFailed": "Login failed"
  }
}
```

---

## Usage in Components

### Server Components

```typescript
import { useTranslations } from 'next-intl'

export default function PatientsPage() {
  const t = useTranslations('patients')

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('newPatient')}</button>
    </div>
  )
}
```

### Client Components

```typescript
'use client'

import { useTranslations } from 'next-intl'

export function SearchPatients() {
  const t = useTranslations('patients')

  return (
    <input placeholder={t('searchPlaceholder')} />
  )
}
```

---

## Language Switcher

```typescript
// components/LanguageSwitcher.tsx
'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <button onClick={toggleLocale} className="px-3 py-1 rounded border">
      {locale === 'ar' ? 'EN' : 'عربي'}
    </button>
  )
}
```

---

## RTL Styling

### Tailwind Configuration

Tailwind v4 has built-in RTL support. Use logical properties:

```css
/* Use logical properties instead of physical */
.sidebar {
  /* Instead of: padding-left: 1rem; */
  padding-inline-start: 1rem;

  /* Instead of: margin-right: 1rem; */
  margin-inline-end: 1rem;

  /* Instead of: border-left: 2px solid; */
  border-inline-start: 2px solid;
}
```

### RTL-Aware Components

```typescript
// Use dir attribute on root element
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>

// Tailwind utilities work automatically with RTL
<div className="ps-4 me-2 text-start">
  {/* ps = padding-start, me = margin-end, text-start = text-align: start */}
</div>
```

---

## Arabic Font

Add Cairo or Noto Sans Arabic for better Arabic text rendering:

```typescript
// app/[locale]/layout.tsx
import { Cairo } from 'next/font/google'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
})

export default function Layout({ children }) {
  return (
    <html className={cairo.variable}>
      <body className="font-cairo">
        {children}
      </body>
    </html>
  )
}
```

```css
/* globals.css */
:root {
  --font-sans: var(--font-cairo), system-ui, sans-serif;
}
```
