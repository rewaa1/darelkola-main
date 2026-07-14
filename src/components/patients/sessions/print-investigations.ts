import { SessionInvestigation, InvestigationCatalog } from "@prisma/client";

// The investigation-request slip the doctor hands the patient to take to the
// lab / imaging centre. Prints on the SAME pre-printed A5 paper as the
// prescription (print-rx): the patient name sits on the "Name:" line, the date
// on the "Date:" area, and the requested tests go where the medications would.
// Category labels and catalog names are English, matching print-rx.

type PrintableRequest = SessionInvestigation & {
  investigation: InvestigationCatalog;
};

type PrintableSession = {
  date: Date | string;
  sessionInvestigations?: PrintableRequest[];
};

// Order tests by category on the slip so labs, imaging, etc. group together.
const CATEGORY_ORDER: InvestigationCatalog["category"][] = [
  "LAB",
  "IMAGING",
  "PROCEDURE",
  "OTHER",
];

const CATEGORY_LABEL: Record<InvestigationCatalog["category"], string> = {
  LAB: "Lab",
  IMAGING: "Imaging",
  PROCEDURE: "Procedure",
  OTHER: "Other",
};

/** True when the session has at least one requested investigation to print. */
export function hasInvestigations(session: PrintableSession): boolean {
  return (session.sessionInvestigations?.length ?? 0) > 0;
}

export function printInvestigations(
  session: PrintableSession,
  patientName: string,
) {
  const requests = session.sessionInvestigations ?? [];
  if (requests.length === 0) return;

  const sessionDate = new Date(session.date);
  const day = sessionDate.getDate().toString().padStart(2, "0");
  const month = (sessionDate.getMonth() + 1).toString().padStart(2, "0");
  const year = sessionDate.getFullYear();

  // Escape user-entered text (test names and notes can be free-form).
  const esc = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );

  // Stable order: by category, then as entered.
  const ordered = [...requests].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.investigation.category) -
      CATEGORY_ORDER.indexOf(b.investigation.category),
  );

  const rowsHtml = ordered
    .map(
      (r, i) =>
        `<div class="inv-row">
          <span class="inv-num">${i + 1}.</span>
          <span class="inv-name">${esc(r.investigation.name)}</span>
          <span class="inv-cat">${CATEGORY_LABEL[r.investigation.category]}</span>
          ${r.notes ? `<div class="inv-notes">${esc(r.notes)}</div>` : ""}
        </div>`,
    )
    .join("");

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Investigations - ${esc(patientName)}</title>
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

          /* Patient name — aligned to the "Name:" line (same as print-rx) */
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

          /* Date — aligned to the "Date: / /" area (same as print-rx) */
          .date-field {
            position: absolute;
            top: 50.5mm;
            right: 15mm;
            font-size: 8pt;
            direction: ltr;
            letter-spacing: 1.5mm;
          }

          /* Requested tests — below the Rx/ symbol, where meds would go */
          .inv-list {
            position: absolute;
            top: 75mm;
            left: 14mm;
            right: 12mm;
          }
          /* Arabic heading — no letter-spacing (it breaks Arabic script joining) */
          .inv-heading {
            font-size: 12pt;
            font-weight: 700;
            direction: rtl;
            text-align: right;
            margin-bottom: 4mm;
          }
          .inv-row {
            margin-bottom: 4mm;
            font-size: 12pt;
            line-height: 1.5;
          }
          .inv-num {
            display: inline-block;
            width: 8mm;
            font-weight: 600;
          }
          .inv-name {
            font-weight: 600;
            margin-right: 3mm;
          }
          .inv-cat {
            color: #555;
            font-size: 9pt;
          }
          .inv-notes {
            margin-left: 8mm;
            font-size: 10pt;
            color: #555;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="patient-name">${esc(patientName)}</div>
        <div class="date-field">${day}  ${month}  ${year}</div>
        <div class="inv-list">
          <div class="inv-heading">الفحوصات المطلوبة</div>
          ${rowsHtml}
        </div>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(printContent);
    win.document.close();
    // Small delay so the background image loads before the print dialog.
    setTimeout(() => win.print(), 300);
  }
}
