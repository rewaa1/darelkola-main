# Sessions Feature

## Overview

Sessions track each patient visit over time. Each session records the **date**, **vitals**, **examination notes**, **medications**, and **medical tests** (lab results).

---

## Data Models

### Medication (Global)

A master list of all medications available in the system. No categories.

| Field     | Type     | Notes       |
| --------- | -------- | ----------- |
| id        | String   | Primary key |
| name      | String   | Drug name   |
| dosage    | String?  | e.g. "500mg"               |
| form      | String?  | e.g. "tablet", "injection" |
| createdAt | DateTime |             |

---

### Session

One record per patient visit.

| Field         | Type     | Notes                       |
| ------------- | -------- | --------------------------- |
| id            | String   | Primary key                 |
| patientId     | String   | FK → Patient                |
| date          | DateTime | Visit date                  |
| examination   | String?  | Free-text examination notes |
| bloodPressure | String?  | e.g. "120/80"               |
| pulse         | String?  | e.g. "72 bpm"               |
| temperature   | String?  | e.g. "37.2°C"               |
| respRate      | String?  | e.g. "18/min"               |
| createdAt     | DateTime |                             |

Relations: `SessionMedication[]`, `InvestigationSheet[]`

---

### SessionMedication (Join Table)

| Field        | Type    | Notes                             |
| ------------ | ------- | --------------------------------- |
| id           | String  | PK                                |
| sessionId    | String  | FK → Session                      |
| medicationId | String  | FK → Medication                   |
| active       | Boolean | Currently active for this session |
| dosage       | String? | e.g. "500mg"                      |
| frequency    | String? | e.g. "twice daily"                |
| duration     | String? | e.g. "7 days"                     |
| notes        | String? | Additional instructions           |

---

### InvestigationSheet

Each session can have **0 or more** investigation sheets, each with its **own date**.

| Field     | Type     | Notes                         |
| --------- | -------- | ----------------------------- |
| id        | String   | PK                            |
| sessionId | String   | FK → Session                  |
| date      | DateTime | Date the tests were performed |

#### Hematology

| Field       | Type   |
| ----------- | ------ |
| hb          | Float? |
| wbc         | Float? |
| neutrophils | Float? |
| lymphocytes | Float? |
| platelets   | Float? |
| esr         | Float? |
| crp         | Float? |

#### Biochemistry / Other

| Field           | Type   |
| --------------- | ------ |
| glucose         | Float? |
| glucosePP       | Float? |
| hba1c           | Float? |
| na              | Float? |
| k               | Float? |
| ca              | Float? |
| po4             | Float? |
| mg              | Float? |
| albumin         | Float? |
| sgot            | Float? |
| sgpt            | Float? |
| totalBilirubin  | Float? |
| directBilirubin | Float? |
| ggt             | Float? |
| alp             | Float? |
| urea            | Float? |
| creatinine      | Float? |
| gfr             | Float? |
| uricAcid        | Float? |
| cholesterol     | Float? |
| ldl             | Float? |
| hdl             | Float? |
| tg              | Float? |
| ft3             | Float? |
| ft4             | Float? |
| tsh             | Float? |
| pth             | Float? |

#### Urine Analysis

| Field        | Type    |
| ------------ | ------- |
| urineRbc     | Float?  |
| pusCells     | Float?  |
| crystals     | String? |
| urineAlb     | String? |
| urinePC      | String? |
| urineCulture | String? |

#### Virology

| Field | Type    |
| ----- | ------- |
| hbsAg | String? |
| hcAb  | String? |
| hivAb | String? |

#### Drug Monitoring / Iron / PSA

| Field     | Type    |
| --------- | ------- |
| inr       | Float?  |
| iron      | Float?  |
| ferritin  | Float?  |
| tibc      | Float?  |
| tsat      | Float?  |
| psaFree   | Float?  |
| psaTotal  | Float?  |
| psaRatio  | Float?  |
| drugLevel | String? |

#### Immunology

| Field   | Type    |
| ------- | ------- |
| ana     | String? |
| antiDna | String? |
| c3      | Float?  |
| c4      | Float?  |
| rf      | String? |
| antiCcp | String? |
| ancaC   | String? |
| ancaP   | String? |
| spep    | String? |

---

### ExtraInvestigation

For custom test results not covered by the standard fields above.

| Field   | Type    | Notes                   |
| ------- | ------- | ----------------------- |
| id      | String  | PK                      |
| sheetId | String  | FK → InvestigationSheet |
| name    | String  | Test name               |
| result  | String? | Result value            |

---

## Active vs Inactive Medications

- Each session has its own set of medications, each marked **active** or **inactive**
- Setting to inactive does **NOT** remove from the master list
- **Active medications** are the ones that get **printed**

---

## UI

### Sessions Tab (Patient Profile)

- List of sessions by date
- Sidebar: all medications, active ones highlighted
- "Add Session" dialog: date, vitals, examination, medications, investigation sheets
- Print button → last session's active meds

### Session Detail

- Vitals, examination, medications (with toggle), investigation sheets
- Print → this session's active meds

### Investigation Sheet View

- Grouped by category (Hematology, Biochemistry, Urine, Virology, Drug, Immunology)
- Only shows fields that have values (hide empty)
- Extra investigations listed below

### Medications Page (`/medications`)

- Global drug catalog (add / delete)

---

## Printing

- Styled prescription layout (design TBD)
- Two entry points: sessions tab (last session) or inside a session

---

## Decisions Made

- ✅ No medication categories
- ✅ Track dosage, frequency, duration, notes per session-medication
- ✅ Styled prescription layout (design TBD)
- ✅ Track vitals per session
- ✅ Investigation sheets with own dates, multiple per session
- ✅ All lab fields are optional
- ✅ Extra investigations for custom tests
