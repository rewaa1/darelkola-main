/**
 * Seeds a batch of ~55 patients (with personal history) for testing list,
 * search and pagination. Does NOT touch clinics, appointments or sessions.
 *
 * Idempotent: patients use deterministic ids (bulk-patient-001 ...), so
 * re-running upserts instead of duplicating. Run with:
 *   npm run seed:patients
 */
import { PrismaClient } from "@prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TOTAL = 55;

const maleFirst = [
  "أحمد", "محمد", "محمود", "مصطفى", "خالد", "عمر", "علي", "حسن", "حسين",
  "إبراهيم", "يوسف", "كريم", "طارق", "سامي", "وليد", "هشام", "أشرف", "ياسر",
  "عماد", "رامي", "زياد", "باسم", "أنس", "طه", "فادي",
];
const femaleFirst = [
  "فاطمة", "عائشة", "مريم", "سارة", "نور", "هدى", "رانيا", "منى", "دعاء",
  "ياسمين", "سلمى", "ندى", "إيمان", "أميرة", "ريهام", "شيماء", "دينا", "هبة",
  "أسماء", "سميرة", "نجلاء", "وفاء", "عبير", "مها", "جميلة",
];
const lastNames = [
  "محمد", "علي", "حسن", "إبراهيم", "عبد الله", "عبد الرحمن", "السيد", "محمود",
  "خليل", "فؤاد", "رشيد", "الشناوي", "الجندي", "عبد العزيز", "فتحي", "صبري",
  "رمضان", "زكي", "حمدي", "عوض",
];
const maleJobs = [
  "مهندس", "طبيب", "مدرّس", "محاسب", "محامٍ", "ممرض", "صيدلي", "موظف",
  "تاجر", "سائق", "فني", "بائع", "مزارع", "طالب",
];
const femaleJobs = [
  "مهندسة", "طبيبة", "مدرّسة", "محاسبة", "محامية", "ممرضة", "صيدلية",
  "موظفة", "ربة منزل", "طالبة", "بائعة",
];
const residences = [
  "القاهرة", "الجيزة", "شبرا", "مدينة نصر", "المعادي", "حلوان", "الإسكندرية",
  "طنطا", "المنصورة", "الزقازيق", "بنها", "أسيوط", "سوهاج", "المنيا", "الفيوم",
  "بورسعيد", "السويس", "الإسماعيلية", "دمياط", "العبور", "٦ أكتوبر",
];
const phonePrefixes = ["10", "11", "12", "15"];

const pick = <T>(arr: T[], i: number) => arr[i % arr.length];

async function main() {
  console.log(`🌱 Seeding ${TOTAL} test patients...`);

  const now = Date.now();
  let created = 0;

  for (let i = 1; i <= TOTAL; i++) {
    const id = `bulk-patient-${String(i).padStart(3, "0")}`;
    const isMale = i % 2 === 0;

    const first = isMale
      ? pick(maleFirst, i)
      : pick(femaleFirst, i);
    const last = pick(lastNames, i * 3 + 1);
    const fullName = `${first} ${last}`;

    // Valid 11-digit Egyptian mobile, unique per i.
    const phoneNumber = `0${pick(phonePrefixes, i)}${String(10000000 + i * 137)
      .slice(-8)}`;

    // Ages spread 18–80.
    const age = 18 + ((i * 7) % 63);
    const birthYear = new Date().getFullYear() - age;
    const dateOfBirth = new Date(
      birthYear,
      (i * 5) % 12,
      ((i * 11) % 28) + 1,
    );

    const offsprings = isMale ? (i * 3) % 5 : (i * 2) % 5;

    // Stagger createdAt over the last ~60 days so the list ordering (desc)
    // looks natural and stable across runs.
    const createdAt = new Date(now - i * 26 * 60 * 60 * 1000);

    await prisma.patient.upsert({
      where: { id },
      update: {},
      create: {
        id,
        createdAt,
        personalHistory: {
          create: {
            fullName,
            phoneNumber,
            dateOfBirth,
            sex: isMale ? "male" : "female",
            maritalStatus: age < 25 && i % 3 === 0 ? "single" : "married",
            offsprings,
            occupation: isMale ? pick(maleJobs, i) : pick(femaleJobs, i),
            residence: pick(residences, i * 2),
          },
        },
      },
    });
    created++;
  }

  console.log(`✅ Upserted ${created} test patients.`);
  console.log("🎉 Done.");
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
