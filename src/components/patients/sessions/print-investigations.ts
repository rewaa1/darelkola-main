import { SessionInvestigation, InvestigationCatalog } from "@prisma/client";

// The investigation-request slip the doctor hands the patient to take to the
// lab / imaging centre. Twin of print-rx, but self-contained (no pre-printed
// template) — it renders its own header, so it prints on plain A5. Output is in
// English, matching print-rx's convention and the English catalog names.

type PrintableRequest = SessionInvestigation & {
  investigation: InvestigationCatalog;
};

type PrintableSession = {
  date: Date | string;
  sessionInvestigations?: PrintableRequest[];
};

const CATEGORY_ORDER: {
  key: InvestigationCatalog["category"];
  label: string;
}[] = [
  { key: "LAB", label: "Laboratory" },
  { key: "IMAGING", label: "Imaging" },
  { key: "PROCEDURE", label: "Procedures" },
  { key: "OTHER", label: "Other" },
];

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

  const groupsHtml = CATEGORY_ORDER.map(({ key, label }) => {
    const items = requests.filter((r) => r.investigation.category === key);
    if (items.length === 0) return "";
    const rows = items
      .map(
        (r) =>
          `<li>
            <span class="test-name">${esc(r.investigation.name)}</span>
            ${r.notes ? `<span class="test-note">— ${esc(r.notes)}</span>` : ""}
          </li>`,
      )
      .join("");
    return `<div class="group">
        <div class="group-title">${label}</div>
        <ul class="test-list">${rows}</ul>
      </div>`;
  }).join("");

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Investigations - ${esc(patientName)}</title>
        <style>
          @page { size: A5 portrait; margin: 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            color: #111;
            font-size: 12pt;
          }
          .header {
            border-bottom: 2px solid #111;
            padding-bottom: 3mm;
            margin-bottom: 5mm;
          }
          .title { font-size: 15pt; font-weight: 700; }
          .meta { display: flex; justify-content: space-between; margin-top: 2mm; font-size: 11pt; }
          .meta .label { color: #555; }
          .group { margin-bottom: 5mm; }
          .group-title {
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5mm;
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 1mm;
            margin-bottom: 2mm;
          }
          .test-list { list-style: none; }
          .test-list li {
            padding: 1.5mm 0;
            border-bottom: 1px dotted #ddd;
            line-height: 1.4;
          }
          .test-name { font-weight: 600; }
          .test-note { color: #555; font-style: italic; font-size: 10pt; }
          .footer {
            margin-top: 12mm;
            display: flex;
            justify-content: flex-end;
            font-size: 10pt;
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Investigation Request</div>
          <div class="meta">
            <span><span class="label">Patient:</span> ${esc(patientName)}</span>
            <span><span class="label">Date:</span> ${day}/${month}/${year}</span>
          </div>
        </div>
        ${groupsHtml}
        <div class="footer">Doctor's signature: ____________________</div>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(printContent);
    win.document.close();
    setTimeout(() => win.print(), 200);
  }
}
