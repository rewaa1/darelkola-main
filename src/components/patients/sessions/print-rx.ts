import { Medication, SessionMedication } from "@prisma/client";

// The prescription print routine, shared by the sessions list (print the last
// Rx) and the post-session prompt (print what was just written). Kept as a
// plain function — it opens a print window, so it is client-only but not a hook.

type PrintableSession = {
  date: Date | string;
  sessionMedications: (SessionMedication & { medication: Medication })[];
};

/** True when the session has at least one active medication worth printing. */
export function hasActiveMeds(session: PrintableSession): boolean {
  return session.sessionMedications.some((sm) => sm.active);
}

export function printPrescription(
  session: PrintableSession,
  patientName: string,
) {
  const activeMeds = session.sessionMedications.filter((sm) => sm.active);
  const sessionDate = new Date(session.date);
  const day = sessionDate.getDate().toString().padStart(2, "0");
  const month = (sessionDate.getMonth() + 1).toString().padStart(2, "0");
  const year = sessionDate.getFullYear();

  const medsHtml = activeMeds
    .map(
      (sm, i) =>
        `<div class="med-row">
          <span class="med-num">${i + 1}.</span>
          <span class="med-name">${sm.medication.name}</span>
          ${sm.dosage || sm.medication.dosage ? `<span class="med-detail">${sm.dosage || sm.medication.dosage}</span>` : ""}
          ${sm.frequency ? `<span class="med-detail">${sm.frequency}</span>` : ""}
          ${sm.duration ? `<span class="med-detail">(${sm.duration})</span>` : ""}
          ${sm.notes ? `<div class="med-notes">${sm.notes}</div>` : ""}
        </div>`,
    )
    .join("");

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Rx - ${patientName}</title>
        <style>
          @page {
            size: A5 portrait;
            margin: 0;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 148mm;
            height: 210mm;
            position: relative;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background-image: url('/rx-template.png');
            background-size: 148mm 210mm;
            background-repeat: no-repeat;
            background-position: top left;
          }
          @media print {
            body {
              background-image: none !important;
            }
          }

          /* Patient name — aligned to the "Name:" line */
          .patient-name {
            position: absolute;
            top: 48.5mm;
            left: 25mm;
            max-width: 70mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 13pt;
            font-weight: 600;
          }

          /* Date — aligned to the "Date: / /" area */
          .date-field {
            position: absolute;
            top: 50.5mm;
            right: 15mm;
            font-size: 8pt;
            direction: ltr;
            letter-spacing: 1.5mm;
          }

          /* Medications list — below the Rx/ symbol */
          .meds-list {
            position: absolute;
            top: 75mm;
            left: 14mm;
            right: 12mm;
          }
          .med-row {
            margin-bottom: 4mm;
            font-size: 12pt;
            line-height: 1.5;
          }
          .med-num {
            display: inline-block;
            width: 8mm;
            font-weight: 600;
          }
          .med-name {
            font-weight: 600;
            margin-right: 3mm;
          }
          .med-detail {
            color: #333;
            margin-right: 3mm;
          }
          .med-notes {
            margin-left: 8mm;
            font-size: 10pt;
            color: #555;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="patient-name">${patientName}</div>
        <div class="date-field">${day}  ${month}  ${year}</div>
        <div class="meds-list">${medsHtml}</div>
      </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(printContent);
    win.document.close();
    // Small delay so the background image loads before print dialog
    setTimeout(() => win.print(), 300);
  }
}
