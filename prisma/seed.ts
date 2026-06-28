import { PrismaClient } from "@prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create Clinic 1 - Shoubra
  const clinic1 = await prisma.clinic.upsert({
    where: { id: "clinic-shoubra" },
    update: { name: "Darelkola - Shoubra" },
    create: {
      id: "clinic-shoubra",
      name: "Darelkola - Shoubra",
      phone: "0100000001",
    },
  });

  // Create Clinic 2 - El Obour
  const clinic2 = await prisma.clinic.upsert({
    where: { id: "clinic-el-obour" },
    update: { name: "Darelkola - El Obour" },
    create: {
      id: "clinic-el-obour",
      name: "Darelkola - El Obour",
      phone: "0100000002",
    },
  });

  console.log("✅ Created clinics:", {
    clinic1: clinic1.name,
    clinic2: clinic2.name,
  });

  // Create Sample Patients
  const patients = [
    {
      id: "patient-1",
      fullName: "Ahmed Mohamed",
      phoneNumber: "01012345678",
      dateOfBirth: new Date("1990-05-15"),
      sex: "male",
      maritalStatus: "married",
      offsprings: 2,
      occupation: "Engineer",
      residence: "Cairo",
    },
    {
      id: "patient-2",
      fullName: "Fatma Ali",
      phoneNumber: "01098765432",
      dateOfBirth: new Date("1985-08-20"),
      sex: "female",
      maritalStatus: "married",
      offsprings: 3,
      occupation: "Teacher",
      residence: "Shoubra",
    },
    {
      id: "patient-3",
      fullName: "Mohamed Hassan",
      phoneNumber: "01155566677",
      dateOfBirth: new Date("1978-12-01"),
      sex: "male",
      maritalStatus: "single",
      offsprings: 0,
      occupation: "Doctor",
      residence: "El Obour",
    },
    {
      id: "patient-4",
      fullName: "Sara Ahmed",
      phoneNumber: "01234567890",
      dateOfBirth: new Date("1995-03-10"),
      sex: "female",
      maritalStatus: "single",
      offsprings: 0,
      occupation: "Accountant",
      residence: "Giza",
    },
    {
      id: "patient-5",
      fullName: "Khaled Ibrahim",
      phoneNumber: "01122334455",
      dateOfBirth: new Date("1982-07-25"),
      sex: "male",
      maritalStatus: "married",
      offsprings: 1,
      occupation: "Lawyer",
      residence: "Nasr City",
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

  console.log(
    "✅ Created patients:",
    patients.map((p) => p.fullName),
  );

  // Update patient-1 (Ahmed Mohamed) with full medical history
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

  // Create previous medications for patient-1
  await prisma.previousMedication.createMany({
    data: [
      {
        patientId: "patient-1",
        drug: "Aspirin 100mg",
        frequency: "Once daily",
      },
      {
        patientId: "patient-1",
        drug: "Metformin 500mg",
        frequency: "Twice daily",
      },
      {
        patientId: "patient-1",
        drug: "Lisinopril 10mg",
        frequency: "Once daily",
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created previous medications for patient-1");

  // Create medications
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
  console.log("✅ Created medications");

  // Create sessions for patient-1
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0);

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  oneMonthAgo.setHours(0, 0, 0, 0);

  // Session 1 - older
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
          {
            medicationId: med1.id,
            active: true,
            dosage: "5mg",
            frequency: "Once daily",
            duration: "Ongoing",
            notes: "Morning dose",
          },
          {
            medicationId: med2.id,
            active: true,
            dosage: "850mg",
            frequency: "Twice daily",
            duration: "Ongoing",
            notes: "With meals",
          },
          {
            medicationId: med3.id,
            active: true,
            dosage: "50mg",
            frequency: "Once daily",
            duration: "Ongoing",
          },
        ],
      },
    },
  });

  // Investigation sheet for session 1
  await prisma.investigationSheet.create({
    data: {
      sessionId: session1.id,
      date: oneMonthAgo,
      hb: 13.5,
      wbc: 7.2,
      neutrophils: 60,
      lymphocytes: 30,
      platelets: 250,
      esr: 15,
      crp: 3.2,
      glucose: 145,
      glucosePP: 180,
      hba1c: 7.8,
      na: 140,
      k: 4.5,
      ca: 9.2,
      albumin: 4.0,
      sgot: 28,
      sgpt: 32,
      totalBilirubin: 0.8,
      urea: 35,
      creatinine: 1.1,
      gfr: 85,
      cholesterol: 220,
      ldl: 140,
      hdl: 42,
      tg: 190,
      tsh: 2.5,
      urineAlb: "Negative",
      hbsAg: "Negative",
      hcAb: "Negative",
      hivAb: "Negative",
      extraInvestigations: {
        create: [
          { name: "ECG", result: "Normal sinus rhythm, no ST changes" },
          {
            name: "Chest X-ray",
            result: "Normal cardiac silhouette, clear lung fields",
          },
        ],
      },
    },
  });
  console.log("✅ Created session 1 with investigation sheet");

  // Session 2 - more recent
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
          {
            medicationId: med1.id,
            active: true,
            dosage: "5mg",
            frequency: "Once daily",
            duration: "Ongoing",
            notes: "Morning dose - continue",
          },
          {
            medicationId: med2.id,
            active: true,
            dosage: "850mg",
            frequency: "Twice daily",
            duration: "Ongoing",
            notes: "With meals - continue",
          },
          {
            medicationId: med3.id,
            active: true,
            dosage: "50mg",
            frequency: "Once daily",
            duration: "Ongoing",
          },
          {
            medicationId: med4.id,
            active: true,
            dosage: "20mg",
            frequency: "Once daily at night",
            duration: "Ongoing",
            notes: "Added for dyslipidemia",
          },
        ],
      },
    },
  });

  // Investigation sheet for session 2
  await prisma.investigationSheet.create({
    data: {
      sessionId: session2.id,
      date: twoWeeksAgo,
      hb: 14.0,
      wbc: 6.8,
      neutrophils: 58,
      lymphocytes: 32,
      platelets: 260,
      esr: 10,
      crp: 1.5,
      glucose: 120,
      glucosePP: 155,
      hba1c: 7.2,
      na: 141,
      k: 4.3,
      ca: 9.4,
      albumin: 4.2,
      sgot: 25,
      sgpt: 28,
      totalBilirubin: 0.7,
      urea: 30,
      creatinine: 1.0,
      gfr: 90,
      cholesterol: 195,
      ldl: 115,
      hdl: 48,
      tg: 160,
      tsh: 2.3,
      iron: 80,
      ferritin: 120,
      tibc: 310,
      tsat: 25.8,
      urineAlb: "Trace",
      urinePC: "150 mg/g",
      hbsAg: "Negative",
      extraInvestigations: {
        create: [
          {
            name: "Echo",
            result: "Normal LV function, EF 60%, no valvular abnormality",
          },
          {
            name: "Fundoscopy",
            result: "Mild diabetic retinopathy bilaterally",
          },
          { name: "HbA1c Trend", result: "Improving from 7.8 to 7.2" },
        ],
      },
    },
  });
  console.log("✅ Created session 2 with investigation sheet");

  // Create an investigation (standalone) for patient-1
  await prisma.investigation.createMany({
    data: [
      {
        patientId: "patient-1",
        date: oneMonthAgo,
        invest: "Renal Ultrasound",
        report: "Both kidneys normal in size. No hydronephrosis. No calculi.",
      },
      {
        patientId: "patient-1",
        date: twoWeeksAgo,
        invest: "CT Abdomen",
        report: "No significant abnormality. Liver and spleen normal.",
      },
    ],
  });
  console.log("✅ Created standalone investigations for patient-1");

  // Create sample appointments for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  // Today's appointments at Shoubra
  const appointments = [
    // Today - Shoubra
    {
      id: "apt-today-1",
      patientId: "patient-1",
      patientName: "Ahmed Mohamed",
      patientPhone: "01012345678",
      clinicId: clinic1.id,
      date: today,
      status: "SCHEDULED" as const,
      notes: "Follow-up visit",
    },
    {
      id: "apt-today-2",
      patientId: "patient-2",
      patientName: "Fatma Ali",
      patientPhone: "01098765432",
      clinicId: clinic1.id,
      date: today,
      status: "SCHEDULED" as const,
      notes: "First visit",
    },
    {
      id: "apt-today-3",
      patientId: "patient-3",
      patientName: "Mohamed Hassan",
      patientPhone: "01155566677",
      clinicId: clinic1.id,
      date: today,
      status: "SCHEDULED" as const,
    },
    // Today - El Obour
    {
      id: "apt-today-4",
      patientId: "patient-4",
      patientName: "Sara Ahmed",
      patientPhone: "01234567890",
      clinicId: clinic2.id,
      date: today,
      status: "SCHEDULED" as const,
      notes: "Routine checkup",
    },
    {
      id: "apt-today-5",
      patientId: "patient-5",
      patientName: "Khaled Ibrahim",
      patientPhone: "01122334455",
      clinicId: clinic2.id,
      date: today,
      status: "SCHEDULED" as const,
    },
    // Yesterday - completed appointments (history)
    {
      id: "apt-yesterday-1",
      patientId: "patient-1",
      patientName: "Ahmed Mohamed",
      patientPhone: "01012345678",
      clinicId: clinic1.id,
      date: yesterday,
      status: "COMPLETED" as const,
      queueNumber: 1,
    },
    {
      id: "apt-yesterday-2",
      patientId: "patient-2",
      patientName: "Fatma Ali",
      patientPhone: "01098765432",
      clinicId: clinic2.id,
      date: yesterday,
      status: "COMPLETED" as const,
      queueNumber: 1,
    },
    // Last week
    {
      id: "apt-lastweek-1",
      patientId: "patient-1",
      patientName: "Ahmed Mohamed",
      patientPhone: "01012345678",
      clinicId: clinic1.id,
      date: lastWeek,
      status: "COMPLETED" as const,
      queueNumber: 2,
      notes: "Initial consultation",
    },
  ];

  for (const apt of appointments) {
    await prisma.appointment.upsert({
      where: { id: apt.id },
      update: {},
      create: apt,
    });
  }

  console.log("✅ Created appointments:", appointments.length);
  console.log(
    "   - Today at Shoubra:",
    appointments.filter((a) => a.clinicId === clinic1.id && a.date === today)
      .length,
  );
  console.log(
    "   - Today at El Obour:",
    appointments.filter((a) => a.clinicId === clinic2.id && a.date === today)
      .length,
  );
  console.log(
    "   - Historical:",
    appointments.filter((a) => a.date < today).length,
  );
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
