---
target: InvestigationRequestsCard (investigation picker)
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-07-16T13-40-19Z
slug: ts-patients-sessions-investigationrequestscard-tsx
---
# Critique: InvestigationRequestsCard (investigation picker in AddSessionForm)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading state; catalog fetch failure silently renders the "empty catalog" message |
| 2 | Match System / Real World | 3 | Domain language good; missing the real-world "panel/profile" concept nephrologists order by |
| 3 | User Control and Freedom | 3 | Toggle on/off, remove, cancel-create all present |
| 4 | Consistency and Standards | 2 | Sibling MedicationsCard does the same pick-from-catalog job with a different pattern and different row anatomy |
| 5 | Error Prevention | 3 | Case-insensitive dedupe on custom add; create disabled until named |
| 6 | Recognition Rather Than Recall | 3 | Full visibility is the point, but scanning 41 flat pills is its own cost |
| 7 | Flexibility and Efficiency | 1 | No filter, no keyboard flow, no frequent-tests tier, no one-tap panels for the nightly repeat workflow |
| 8 | Aesthetic and Minimalist Design | 2 | Wall of ~52 uniform pills, selected state duplicated in two zones, three stacked border treatments |
| 9 | Error Recovery | 1 | `.catch(() => {})` swallows catalog load errors and shows "No tests in the catalog yet" — actively misleading, and migration 006 being unrun makes it the *current* behavior |
| 10 | Help and Documentation | 2 | Self-explanatory enough; empty states exist |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict
Deterministic scan: clean (0 findings on InvestigationRequestsCard.tsx and AddSessionForm.tsx). No browser overlay available this session (no browser automation); source-based review only.
LLM assessment: no slop tells (no side-stripes, gradients, glass). The failure mode is the product-register one: a standard affordance (chip picker) deployed without the state work and findability work that makes it trustworthy.

## Priority Issues

- **[P1] Findability: 41 LAB pills in a flat alphabetical wrap.** Alphabetical order is useless in a flex-wrap (rows break arbitrarily; the eye can't binary-search). Doctor scans ~8 ragged rows for "TSH" mid-consultation. Fix: chunk LAB using the project's existing lab-group vocabulary (biochemistry, urine, virology, immunology, drug/iron/PSA) + a "common" first tier; and/or an inline filter that narrows pills in place (list stays a list — no dropdown).
- **[P1] Efficiency: no fast path for the nightly repeat order.** Nephrology visits order near-identical sets (creatinine, urea, eGFR, electrolytes, CBC, urine). No frequents tier, no panels, no keyboard flow. The doctor pays the full scan cost on every session, ~30x/night.
- **[P1] Silent failure state.** Catalog load error → "No tests in the catalog yet". With migration 006 unrun this is what renders today. Fix: skeleton while loading, real error message with retry on failure, true empty state only when the catalog is genuinely empty.
- **[P2] Selected-row anatomy breaks on mobile and diverges from MedicationsCard.** `shrink-0` on badge+name squeezes the notes input toward 0 on narrow screens ("Serum Protein Electrophoresis" leaves ~80px for notes on a 360px phone). MedicationsCard stacks name-row above inputs; this card crams one line.
- **[P2] Pill ergonomics.** text-xs at ~24px tall: marginal touch targets, small for 2AM night-shift reading, no `focus-visible` ring on the raw `<button>` (PRODUCT.md demands keyboard-first), selected state carried by fill alone (add a check glyph).

## Persona Red Flags
- **Alex (the doctor, 2AM, 30 patients):** no keyboard path, no filter, no frequents, full-wall scan per session. Highest-frequency interaction in the form, slowest affordance.
- **Sam (a11y):** no focus-visible on pills; targets ~24px; selected state needs a non-color channel (check icon).
- **Casey (mobile/one-handed):** nested scroll container inside a long form (scroll trap); notes input squeezed by shrink-0 row.

## Minor Observations
- Three border treatments stacked in one card (scroll box border + dashed create panel + bordered rows) — visually busy; the pill area could drop its border for a bg tint or nothing.
- Selected pills stay in the wall AND appear as rows below — two representations of the same state; acceptable chip-picker pattern but contributes to height/noise.
- Custom-create has no pending state during the server call.

## Questions to Consider
- Should "common tests" be data-driven (order by historical request count) instead of hand-picked?
- Do one-tap panels ("Renal Profile") belong in this card or as a doctor-configurable feature later?
- Is an in-place filter compatible with the "list not search" requirement? (The list stays visible; typing narrows it.)
