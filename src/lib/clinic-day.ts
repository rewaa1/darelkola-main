// The clinic works nights: a shift opens around 9 PM and closes between 3 and
// 5 AM. A "day" here is a working day, not a calendar day — the patient seen at
// 4 AM belongs to the queue that opened the evening before.
//
// Everything that asks "what is today" for appointments must go through here.
// Taking the UTC calendar day instead empties the queue at 3 AM Cairo time in
// summer (2 AM in winter), in the middle of the shift's last hour, and makes a
// session written at 2 AM land on tomorrow's date.

export const CLINIC_TIME_ZONE = "Africa/Cairo";

/**
 * Local hour at which a new working day begins. Before it, we are still on the
 * previous day's shift. Sits after the latest 5 AM finish and before the
 * earliest a morning clinic could start.
 */
export const CLINIC_DAY_ROLLOVER_HOUR = 8;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// hourCycle h23 rather than hour12: false — the latter reports midnight as 24
// under some ICU builds, which would roll the day backwards an extra time.
const zoned = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function zonedParts(instant: Date) {
  const parts = zoned.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
  };
}

/**
 * The working day an instant falls in, as that day at UTC midnight — the same
 * representation `appointment.date` (@db.Date) is written with, so the two can
 * be compared directly.
 */
export function clinicDay(instant: Date = new Date()): Date {
  const { year, month, day, hour } = zonedParts(instant);

  // Date.UTC is safe to shift by a fixed day: UTC has no DST, and the value is
  // a date-only marker rather than a real moment in the clinic's evening.
  const midnight = Date.UTC(year, month - 1, day);
  const beforeRollover = hour < CLINIC_DAY_ROLLOVER_HOUR;

  return new Date(beforeRollover ? midnight - MS_PER_DAY : midnight);
}

/** The working day as "YYYY-MM-DD", for comparing against a picked calendar day. */
export function clinicDayString(instant: Date = new Date()): string {
  return clinicDay(instant).toISOString().slice(0, 10);
}

/**
 * The working day as a *local* midnight Date.
 *
 * Calendar pickers hand back local-midnight Dates and `format()` reads them
 * with local getters, so a UTC-midnight value from `clinicDay()` would render
 * as the previous day for any browser behind UTC. Use this to seed a picker.
 */
export function clinicDayLocal(instant: Date = new Date()): Date {
  const [year, month, day] = clinicDayString(instant).split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Normalize a "YYYY-MM-DD" (or ISO) string to that calendar day at UTC midnight. */
export function toDateOnly(day: string): Date {
  return new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
}
