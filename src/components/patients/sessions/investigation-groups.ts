// Grouping for the investigation picker. The catalog only stores the coarse
// category (LAB/IMAGING/PROCEDURE/OTHER); the finer lab grouping mirrors the
// lab-sheet vocabulary (labCategories in lab-fields.ts) and is keyed on the
// seeded catalog names. Tests added later through "add new" fall into the
// trailing group of their category. Labels live under "investGroups".

import type { InvestigationCatalog } from "@prisma/client";

// The handful of tests a nephrology clinic orders on most visits — shown as
// the first tier so the usual order is one glance away. Each test appears in
// exactly one group: membership here removes it from its lab group below.
const COMMON = [
  "CBC",
  "Creatinine",
  "Urea",
  "eGFR",
  "Serum Sodium",
  "Serum Potassium",
  "Urine Analysis",
  "HbA1c",
];

const LAB_GROUPS: { key: string; names: string[] }[] = [
  { key: "hematology", names: ["CBC", "ESR", "CRP"] },
  {
    key: "biochemistry",
    names: [
      "Fasting Blood Sugar",
      "Postprandial Blood Sugar",
      "HbA1c",
      "Serum Sodium",
      "Serum Potassium",
      "Serum Calcium",
      "Serum Phosphorus",
      "Serum Magnesium",
      "Serum Albumin",
      "Liver Function Tests",
      "Total & Direct Bilirubin",
      "Urea",
      "Creatinine",
      "eGFR",
      "Uric Acid",
      "Lipid Profile",
      "FT3",
      "FT4",
      "TSH",
      "PTH",
    ],
  },
  { key: "urine", names: ["Urine Analysis", "Urine Culture"] },
  { key: "virology", names: ["HBsAg", "HCV Antibody", "HIV Antibody"] },
  { key: "drugIronPsa", names: ["INR", "Serum Iron", "Ferritin", "TIBC", "PSA"] },
  {
    key: "immunology",
    names: [
      "ANA",
      "Anti-dsDNA",
      "Complement C3",
      "Complement C4",
      "Rheumatoid Factor",
      "Anti-CCP",
      "ANCA",
      "Serum Protein Electrophoresis",
    ],
  },
];

const COMMON_SET = new Set(COMMON.map((n) => n.toLowerCase()));
const LAB_GROUP_BY_NAME = new Map<string, string>(
  LAB_GROUPS.flatMap((g) => g.names.map((n) => [n.toLowerCase(), g.key])),
);

export interface InvestigationGroup {
  /** Translation key under the "investGroups" namespace. */
  key: string;
  items: InvestigationCatalog[];
}

/**
 * Split the catalog into the picker's display groups, in display order:
 * common → lab groups → other lab → imaging → procedure → other.
 * Groups with no items are omitted; every catalog item lands exactly once.
 */
export function groupCatalog(
  catalog: InvestigationCatalog[],
): InvestigationGroup[] {
  const buckets = new Map<string, InvestigationCatalog[]>();
  const push = (key: string, item: InvestigationCatalog) => {
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  };

  for (const item of catalog) {
    const name = item.name.toLowerCase();
    if (COMMON_SET.has(name)) push("common", item);
    else if (item.category === "LAB")
      push(LAB_GROUP_BY_NAME.get(name) ?? "otherLab", item);
    else if (item.category === "IMAGING") push("imaging", item);
    else if (item.category === "PROCEDURE") push("procedure", item);
    else push("other", item);
  }

  const order = [
    "common",
    ...LAB_GROUPS.map((g) => g.key),
    "otherLab",
    "imaging",
    "procedure",
    "other",
  ];
  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({ key, items: buckets.get(key)! }));
}
