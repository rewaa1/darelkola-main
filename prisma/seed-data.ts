/**
 * Seeds sample data WITHOUT creating clinics.
 * It reuses whatever clinics already exist in the database and wires the
 * sample appointments to them. Run with:
 *   npm run seed:data
 */
import { PrismaClient } from "@prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding sample data (clinics are left untouched)...");

  // --- Use EXISTING clinics (do not create any) ---
  const clinics = await prisma.clinic.findMany({ orderBy: { createdAt: "asc" } });
  if (clinics.length === 0) {
    throw new Error(
      "No clinics found. Add at least one clinic in the app first, then re-run this seed.",
    );
  }
  const clinic1 = clinics[0];
  const clinic2 = clinics[1] ?? clinics[0];
  console.log(
    `✅ Using existing clinics: "${clinic1.name}"` +
      (clinic2.id !== clinic1.id ? ` and "${clinic2.name}"` : ""),
  );

  // --- Patients ---
  const patients = [
    {
      id: "patient-1",
      fullName: "أحمد محمد",
      phoneNumber: "01012345678",
      dateOfBirth: new Date("1990-05-15"),
      sex: "male",
      maritalStatus: "married",
      offsprings: 2,
      occupation: "مهندس",
      residence: "القاهرة",
    },
    {
      id: "patient-2",
      fullName: "فاطمة علي",
      phoneNumber: "01098765432",
      dateOfBirth: new Date("1985-08-20"),
      sex: "female",
      maritalStatus: "married",
      offsprings: 3,
      occupation: "مدرّسة",
      residence: "شبرا",
    },
    {
      id: "patient-3",
      fullName: "محمد حسن",
      phoneNumber: "01155566677",
      dateOfBirth: new Date("1978-12-01"),
      sex: "male",
      maritalStatus: "single",
      offsprings: 0,
      occupation: "طبيب",
      residence: "العبور",
    },
    {
      id: "patient-4",
      fullName: "سارة أحمد",
      phoneNumber: "01234567890",
      dateOfBirth: new Date("1995-03-10"),
      sex: "female",
      maritalStatus: "single",
      offsprings: 0,
      occupation: "محاسبة",
      residence: "الجيزة",
    },
    {
      id: "patient-5",
      fullName: "خالد إبراهيم",
      phoneNumber: "01122334455",
      dateOfBirth: new Date("1982-07-25"),
      sex: "male",
      maritalStatus: "married",
      offsprings: 1,
      occupation: "محامٍ",
      residence: "مدينة نصر",
    },
  ];

  for (const p of patients) {
    await prisma.patient.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        personalHistory: {
          create: {
            fullName: p.fullName,
            phoneNumber: p.phoneNumber,
            dateOfBirth: p.dateOfBirth,
            sex: p.sex,
            maritalStatus: p.maritalStatus,
            offsprings: p.offsprings,
            occupation: p.occupation,
            residence: p.residence,
          },
        },
      },
    });
  }
  console.log("✅ Created patients:", patients.length);

  // --- Full medical history for patient-1 ---
  await prisma.personalHistory.update({
    where: { patientId: "patient-1" },
    data: {
      presentHistory:
        "Patient presents with hypertension and type 2 diabetes for 5 years. Well controlled on current medications. No recent hospitalizations.",
      pastHistory:
        "Appendectomy in 2015. No history of blood transfusion. Allergic to penicillin.",
      familyHistory:
        "Father had coronary artery disease. Mother has hypertension and diabetes. No family history of cancer.",
      built: "Average",
      behavior: "Cooperative",
      intelligence: "Average",
      facies: "Normal",
      decubitus: "Comfortable",
      bloodPressure: "130/85",
      pulse: "78",
      supine: "120/80",
      respRate: "16",
      temperature: "36.8",
      headAndNeck: "Normal",
      lymphNodes: "No lymphadenopathy",
      neckVeins: "Normal JVP",
      thyroid: "Normal, no goiter",
      upperLimb: "No edema, normal tone",
      lowerLimb: "Mild pitting edema bilaterally",
      peripheralPulse: "All pulses palpable",
      cardioExam: "S1 S2 heard. No murmurs. Regular rhythm.",
      chestExam: "Bilateral air entry equal. No added sounds.",
      abdomenExam: "Soft, non-tender. No organomegaly.",
      neuroExam: "Intact. DTR normal. No focal deficit.",
      provisionalDx: "Essential Hypertension; Type 2 DM",
      comments: "Continue current medications. Follow up in 2 weeks.",
    },
  });
  console.log("✅ Updated patient-1 with full medical history");

  // Clinical records below are created (not upserted), so guard against
  // duplicates if the seed is run more than once.
  const patient1HasSessions =
    (await prisma.session.count({ where: { patientId: "patient-1" } })) > 0;
  if (patient1HasSessions) {
    console.log(
      "ℹ️  patient-1 already has sessions — skipping previous meds / sessions / investigations to avoid duplicates.",
    );
  }

  // --- Previous medications for patient-1 ---
  if (!patient1HasSessions) {
    await prisma.previousMedication.createMany({
      data: [
        { patientId: "patient-1", drug: "Aspirin 100mg", frequency: "Once daily" },
        { patientId: "patient-1", drug: "Metformin 500mg", frequency: "Twice daily" },
        { patientId: "patient-1", drug: "Lisinopril 10mg", frequency: "Once daily" },
      ],
      skipDuplicates: true,
    });
    console.log("✅ Created previous medications for patient-1");
  }

  // --- Medications ---
  const med1 = await prisma.medication.upsert({
    where: { name: "Amlodipine 5mg" },
    update: {},
    create: { name: "Amlodipine 5mg", dosage: "5mg", form: "Tablet" },
  });
  const med2 = await prisma.medication.upsert({
    where: { name: "Metformin 850mg" },
    update: {},
    create: { name: "Metformin 850mg", dosage: "850mg", form: "Tablet" },
  });
  const med3 = await prisma.medication.upsert({
    where: { name: "Losartan 50mg" },
    update: {},
    create: { name: "Losartan 50mg", dosage: "50mg", form: "Tablet" },
  });
  const med4 = await prisma.medication.upsert({
    where: { name: "Atorvastatin 20mg" },
    update: {},
    create: { name: "Atorvastatin 20mg", dosage: "20mg", form: "Tablet" },
  });
  // A few extra standalone meds so the Medications page looks populated.
  for (const m of [
    { name: "Bisoprolol 5mg", dosage: "5mg", form: "Tablet" },
    { name: "Omeprazole 20mg", dosage: "20mg", form: "Capsule" },
    { name: "Furosemide 40mg", dosage: "40mg", form: "Tablet" },
    { name: "Insulin Glargine", dosage: "100 IU/mL", form: "Injection" },
    { name: "Amoxicillin 500mg", dosage: "500mg", form: "Capsule" },
  ]) {
    await prisma.medication.upsert({ where: { name: m.name }, update: {}, create: m });
  }
  console.log("✅ Created medications");

  // --- Sessions for patient-1 ---
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0);

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  oneMonthAgo.setHours(0, 0, 0, 0);

  if (!patient1HasSessions) {
  const session1 = await prisma.session.create({
    data: {
      patientId: "patient-1",
      date: oneMonthAgo,
      examination:
        "Patient appears well. BP slightly elevated. Mild bilateral pedal edema. Heart sounds normal. Lungs clear.",
      bloodPressure: "140/90",
      pulse: "82",
      temperature: "36.5",
      respRate: "18",
      sessionMedications: {
        create: [
          { medicationId: med1.id, active: true, dosage: "5mg", frequency: "Once daily", duration: "Ongoing", notes: "Morning dose" },
          { medicationId: med2.id, active: true, dosage: "850mg", frequency: "Twice daily", duration: "Ongoing", notes: "With meals" },
          { medicationId: med3.id, active: true, dosage: "50mg", frequency: "Once daily", duration: "Ongoing" },
        ],
      },
    },
  });

  await prisma.investigationSheet.create({
    data: {
      sessionId: session1.id,
      date: oneMonthAgo,
      hb: 13.5, wbc: 7.2, neutrophils: 60, lymphocytes: 30, platelets: 250, esr: 15, crp: 3.2,
      glucose: 145, glucosePP: 180, hba1c: 7.8, na: 140, k: 4.5, ca: 9.2, albumin: 4.0,
      sgot: 28, sgpt: 32, totalBilirubin: 0.8, urea: 35, creatinine: 1.1, gfr: 85,
      cholesterol: 220, ldl: 140, hdl: 42, tg: 190, tsh: 2.5,
      urineAlb: "Negative", hbsAg: "Negative", hcAb: "Negative", hivAb: "Negative",
      extraInvestigations: {
        create: [
          { name: "ECG", result: "Normal sinus rhythm, no ST changes" },
          { name: "Chest X-ray", result: "Normal cardiac silhouette, clear lung fields" },
        ],
      },
    },
  });
  console.log("✅ Created session 1 with investigation sheet");

  const session2 = await prisma.session.create({
    data: {
      patientId: "patient-1",
      date: twoWeeksAgo,
      examination:
        "Improved BP. Edema resolved. Compliant with medication regimen. No new complaints.",
      bloodPressure: "130/80",
      pulse: "76",
      temperature: "36.7",
      respRate: "16",
      sessionMedications: {
        create: [
          { medicationId: med1.id, active: true, dosage: "5mg", frequency: "Once daily", duration: "Ongoing", notes: "Morning dose - continue" },
          { medicationId: med2.id, active: true, dosage: "850mg", frequency: "Twice daily", duration: "Ongoing", notes: "With meals - continue" },
          { medicationId: med3.id, active: true, dosage: "50mg", frequency: "Once daily", duration: "Ongoing" },
          { medicationId: med4.id, active: true, dosage: "20mg", frequency: "Once daily at night", duration: "Ongoing", notes: "Added for dyslipidemia" },
        ],
      },
    },
  });

  await prisma.investigationSheet.create({
    data: {
      sessionId: session2.id,
      date: twoWeeksAgo,
      hb: 14.0, wbc: 6.8, neutrophils: 58, lymphocytes: 32, platelets: 260, esr: 10, crp: 1.5,
      glucose: 120, glucosePP: 155, hba1c: 7.2, na: 141, k: 4.3, ca: 9.4, albumin: 4.2,
      sgot: 25, sgpt: 28, totalBilirubin: 0.7, urea: 30, creatinine: 1.0, gfr: 90,
      cholesterol: 195, ldl: 115, hdl: 48, tg: 160, tsh: 2.3,
      iron: 80, ferritin: 120, tibc: 310, tsat: 25.8,
      urineAlb: "Trace", urinePC: "150 mg/g", hbsAg: "Negative",
      extraInvestigations: {
        create: [
          { name: "Echo", result: "Normal LV function, EF 60%, no valvular abnormality" },
          { name: "Fundoscopy", result: "Mild diabetic retinopathy bilaterally" },
          { name: "HbA1c Trend", result: "Improving from 7.8 to 7.2" },
        ],
      },
    },
  });
  console.log("✅ Created session 2 with investigation sheet");

  // --- Standalone investigations for patient-1 ---
  await prisma.investigation.createMany({
    data: [
      { patientId: "patient-1", date: oneMonthAgo, invest: "Renal Ultrasound", report: "Both kidneys normal in size. No hydronephrosis. No calculi." },
      { patientId: "patient-1", date: twoWeeksAgo, invest: "CT Abdomen", report: "No significant abnormality. Liver and spleen normal." },
    ],
  });
  console.log("✅ Created standalone investigations for patient-1");
  }

  // --- Appointments (today / yesterday / last week) ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const byId = Object.fromEntries(patients.map((p) => [p.id, p]));
  const appt = (
    id: string,
    patientId: string,
    clinicId: string,
    date: Date,
    status: "SCHEDULED" | "CHECKED_IN" | "COMPLETED",
    extra: {
      notes?: string;
      queueNumber?: number;
      type?: "FAST_EXAMINATION" | "REGULAR_EXAMINATION" | "CONSULTATION";
    } = {},
  ) => ({
    id,
    patientId,
    patientName: byId[patientId].fullName,
    patientPhone: byId[patientId].phoneNumber,
    clinicId,
    date,
    status,
    ...extra,
  });

  const appointments = [
    // Today — clinic 1
    appt("apt-today-1", "patient-1", clinic1.id, today, "SCHEDULED", { notes: "Follow-up visit", type: "REGULAR_EXAMINATION" }),
    appt("apt-today-2", "patient-2", clinic1.id, today, "SCHEDULED", { notes: "First visit", type: "FAST_EXAMINATION" }),
    appt("apt-today-3", "patient-3", clinic1.id, today, "SCHEDULED", { type: "CONSULTATION" }),
    // Today — clinic 2
    appt("apt-today-4", "patient-4", clinic2.id, today, "SCHEDULED", { notes: "Routine checkup", type: "REGULAR_EXAMINATION" }),
    appt("apt-today-5", "patient-5", clinic2.id, today, "SCHEDULED", { type: "FAST_EXAMINATION" }),
    // History
    appt("apt-yesterday-1", "patient-1", clinic1.id, yesterday, "COMPLETED", { queueNumber: 1, type: "REGULAR_EXAMINATION" }),
    appt("apt-yesterday-2", "patient-2", clinic2.id, yesterday, "COMPLETED", { queueNumber: 1, type: "CONSULTATION" }),
    appt("apt-lastweek-1", "patient-1", clinic1.id, lastWeek, "COMPLETED", { queueNumber: 2, notes: "Initial consultation", type: "CONSULTATION" }),
  ];

  for (const a of appointments) {
    await prisma.appointment.upsert({ where: { id: a.id }, update: {}, create: a });
  }
  console.log("✅ Created appointments:", appointments.length);

  console.log("🎉 Sample data seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
