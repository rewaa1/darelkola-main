# Product

## Register

product

> The app is a product surface. The public splash at `/` is the one **brand** surface in the
> codebase and is designed under `reference/brand.md`. Everything behind `/login` follows the
> product register.

## Users

Clinical staff at Darelkola (عيادة دار الكلى), a two-branch nephrology clinic in Cairo.

- **Doctors** — nephrologists. Open a patient mid-consultation, read the investigation sheet
  (creatinine, GFR, urea, PTH, ANCA, immunosuppressant drug levels), run a session, prescribe.
  They are looking at the screen while a patient is talking to them.
- **Receptionists** — register patients, book the day, run the arrival queue, print prescriptions.
  They are looking at the screen while a waiting room looks back at them.

Both roles have identical system permissions. Both work in Arabic or English, and the UI is fully
RTL. Context is a busy clinic: interruptions, one hand on the phone, a queue that never stops.
Nobody is browsing. Everybody is mid-task.

## Product Purpose

Darelkola is the clinic's system of record. It replaces paper: patient files, the day's bookings,
the arrival queue, session notes, lab sheets, prescriptions.

The appointment model is the load-bearing idea and is unusual: **booking is a day, not a time.**
Patients are booked to a date; when they physically arrive they take a queue number, and first to
arrive is first seen. The software has to model a waiting room, not a calendar.

Success is invisible: a full clinic day where nobody had to ask "where is that patient's file?"

## Brand Personality

**Calibrated. Unhurried. Load-bearing.**

The voice of a well-made instrument — precise, quiet, and completely trustworthy under load. It
does not congratulate the user, does not use exclamation marks, and never describes itself as
"powerful" or "seamless." It states the number and gets out of the way.

Emotional goal at the threshold (the splash): the settled confidence of switching on a machine that
you know is going to work. Not excitement. Not warmth. Composure.

## Anti-references

- **The AI-futuristic medical page.** Cyan and teal neon, aurora gradient blobs, frosted glass
  cards, drifting particle starfields. This is the single most predictable output for "futuristic
  clinic" and it is banned outright.
- **The ECG heartbeat line.** It is cardiology's symbol. On a kidney clinic it is a domain error
  dressed up as a design decision.
- **Stock photography of clinicians.** Folded arms, stethoscopes, middle distance.
- **Hero-metric SaaS templates.** "10,000+ patients managed." Nobody signing into their own
  workplace needs to be sold to.
- **Editorial-magazine drift.** Display serif italics, drop caps, ruled three-column grids. A
  correct aesthetic for a literary quarterly; costume on a lab system.
- **Egypt-as-decoration.** Sand, gold, arabesque pattern fills. The Arabic reading comes from the
  typography and the copy, never from the palette.

## Design Principles

1. **The instrument, not the interface.** Darelkola is closer to a lab analyzer than to a website.
   Chrome recedes; readouts, tick marks, and state indicators carry the design. Every ornament must
   plausibly be a control or a measurement.
2. **No ornament that needs a caption.** A metaphor the designer has to stand next to and explain has
   already failed. Staff read a screen in two seconds; anything on it must be legible in two seconds
   or be removed. This principle cost us an eGFR gauge and a nephron filtration animation, both of
   which were beautiful and neither of which read as anything.
3. **Arabic is a first language, not a translation.** RTL is not a mirrored afterthought. Layouts use
   logical properties, motion vectors flip with direction, and Arabic type is set to be read, not to
   prove the feature exists.
4. **Earn every animation.** Motion either communicates system state (a boot self-test, a queue
   advancing) or it does not ship. Staff see the splash twice a day for years; anything that
   performs for the user rather than informing them becomes an irritant by week three.
5. **Never gate content on a flourish.** The button is clickable on the first frame. The reveal is
   something the page does while you are already able to use it.

## Accessibility & Inclusion

- **WCAG 2.2 AA.** Body text ≥4.5:1, large text ≥3:1, verified — not assumed — against the near-black
  surface. Muted text is held at ≥4.5:1 rather than the usual decorative gray.
- **Reduced motion is a real path, not a disabled one.** Under `prefers-reduced-motion: reduce` the
  dial holds still, the filtration field renders one composed static frame, and the entrance becomes
  an instant crossfade. The page loses nothing it needed to say.
- **Keyboard first.** Visible `:focus-visible` rings on every interactive element, in a color that
  survives the dark surface. No hover-only affordances.
- **Bilingual, bidirectional.** Every surface must be legible and correctly ordered in `ar` (RTL) and
  `en` (LTR), including animation direction.
- **Color is never the only channel.** Status is carried by dot + label + position, never hue alone.
  Any red/green pairing must be separated by lightness too, and must survive deuteranopia and
  protanopia — verify it, don't assume it.
