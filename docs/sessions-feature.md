# Sessions Feature

## Overview

Sessions track each patient visit over time. Each session records the **date**, **vitals**, **examination notes**, and **medications**.

**Lab results are not entered inside a session.** Reception enters them on the patient's **Lab Results** tab when the patient arrives, before the doctor's session exists. The next session created for that patient claims the pending sheets, which is how each sheet ends up stamped with the date of the session it arrived on.

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

Relations: `SessionMedication[]`, `InvestigationSheet[]` (claimed at creation — see below)

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

Owned by the **patient**, optionally linked to a **session**. A patient can have any number of sheets, each with its **own date** (when the tests were performed — often earlier than the visit).

| Field     | Type      | Notes                                            |
| --------- | --------- | ------------------------------------------------ |
| id        | String    | PK                                               |
| patientId | String    | FK → Patient                                     |
| sessionId | String?   | FK → Session. `null` until a session claims it   |
| date      | DateTime  | Date the tests were performed                    |
| createdAt | DateTime  | When reception entered it                        |

**Lifecycle**

1. Reception opens the patient's **Lab Results** tab and enters one or more sheets. They are saved with `sessionId = null` and show an *Awaiting session* badge.
2. The doctor creates a session. Inside that transaction, every sheet for the patient with `sessionId = null` is stamped with the new session's id.
3. From then on the sheet displays the session date it arrived on, and appears read-only inside that session's detail view.

Deleting a session sets `sessionId` back to `null` (`onDelete: SetNull`) rather than deleting the patient's lab history. Those sheets become pending again and will be claimed by the next session.

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
- "Add Session" form: date, vitals, examination, medications, then the patient's lab results (read-only) so the doctor can consult them while writing the session
- Print button → last session's active meds

### Session Detail

- Vitals, examination, medications (with toggle)
- Lab results after the medications, as the same compare table used on the Lab Results tab: the patient's **whole** lab history, with the column(s) belonging to this session tinted and labelled *This session*. Showing only this session's sheets would defeat the point — the doctor needs the earlier ones to compare against.
- Read-only; sheets are added and deleted from the Lab Results tab
- Print → this session's active meds

### Lab Results Tab (Patient Profile)

Also rendered on the doctor's current-patient view in the queue.

- **Sheets view** — every sheet the patient has ever had, newest first, each badged with its session date or *Awaiting session*
- **Compare view** — tests down the side, sheet dates across the top, **newest first**, so the most recent results sit in the leading column and older ones trail off to the side. Only tests with at least one recorded value get a row; a blank cell means that sheet did not include the test.
- "Add Sheets" dialog — several sheets entered at once, which is what reception does when a patient arrives with a stack of them

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
- ✅ Investigation sheets belong to the patient, with their own test dates
- ✅ Sheets are entered by reception before the session, then claimed by the next session created
- ✅ Sheets are read-only inside a session; they are added and deleted from the Lab Results tab
- ✅ All lab fields are optional
- ✅ Extra investigations for custom tests
