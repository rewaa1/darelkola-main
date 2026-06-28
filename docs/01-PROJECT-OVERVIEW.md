# Darelkola - Clinic CRM System

## Project Overview

A bilingual (Arabic/English) CRM system for managing a multi-branch medical clinic. Built with Next.js 16, Supabase, and Prisma.

---

## Core Features

| Feature                   | Description                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Patient Records**       | Comprehensive patient data including personal info, medical history, examinations, and investigations |
| **Appointment Booking**   | Two-level system: day reservation + arrival-based queue                                               |
| **Prescription Tracking** | Active medications, session prescriptions, PDF generation                                             |
| **Multi-Branch**          | Support for 2 clinic branches                                                                         |
| **Bilingual UI**          | Full Arabic and English support with RTL                                                              |

---

## User Roles

| Role             | Responsibilities                                                             |
| ---------------- | ---------------------------------------------------------------------------- |
| **Doctor**       | View patients, conduct sessions, write prescriptions, access medical records |
| **Receptionist** | Book appointments, manage queue, register patients, print prescriptions      |

> **Note**: Both roles have equal system access (no permission differentiation).

---

## Technology Stack

| Layer                | Technology                  |
| -------------------- | --------------------------- |
| **Framework**        | Next.js 16 (App Router)     |
| **Language**         | TypeScript                  |
| **Database**         | Supabase (PostgreSQL)       |
| **ORM**              | Prisma                      |
| **Authentication**   | Supabase Auth               |
| **File Storage**     | Supabase Storage            |
| **Styling**          | Tailwind CSS v4 + shadcn/ui |
| **i18n**             | next-intl                   |
| **State Management** | TanStack Query              |
| **PDF Generation**   | @react-pdf/renderer         |
| **Deployment**       | Vercel (recommended)        |

---

## Appointment System (Key Concept)

```
┌─────────────────────────────────────────────────────────┐
│                    LEVEL 1: Day Booking                 │
│                                                         │
│  Receptionist books patients for a specific DATE        │
│  Example: "Patient Ahmed → January 30th"                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 LEVEL 2: Arrival Queue                  │
│                                                         │
│  When patient arrives, they get a queue number          │
│  First to arrive = First to see doctor                  │
│                                                         │
│  Queue:  1. Ahmed (arrived 9:00)                        │
│          2. Sara (arrived 9:15)                         │
│          3. Omar (arrived 9:30)                         │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure (Planned)

```
src/
├── app/
│   ├── [locale]/              # Internationalized routes
│   │   ├── (auth)/            # Login pages
│   │   ├── (dashboard)/       # Main app
│   │   │   ├── patients/      # Patient management
│   │   │   ├── appointments/  # Booking & queue
│   │   │   ├── queue/         # Today's queue view
│   │   │   └── settings/      # User settings
│   │   └── layout.tsx
│   └── api/                   # API routes
├── components/
│   ├── ui/                    # shadcn components
│   ├── patients/              # Patient-related components
│   ├── appointments/          # Appointment components
│   └── prescriptions/         # Prescription components
├── lib/
│   ├── supabase/              # Supabase client
│   ├── prisma/                # Prisma client
│   └── utils/                 # Utilities
├── i18n/                      # Translation files
│   ├── ar/
│   └── en/
└── types/                     # TypeScript types
```

---

## Related Documentation

1. [Database Schema](./02-DATABASE-SCHEMA.md)
2. [Authentication](./03-AUTHENTICATION.md)
3. [Appointment System](./04-APPOINTMENT-SYSTEM.md)
4. [Patient Management](./05-PATIENT-MANAGEMENT.md)
5. [Prescription Tracking](./06-PRESCRIPTION-TRACKING.md)
6. [File Uploads](./07-FILE-UPLOADS.md)
7. [Internationalization](./08-INTERNATIONALIZATION.md)
8. [Project Setup](./09-PROJECT-SETUP.md)
