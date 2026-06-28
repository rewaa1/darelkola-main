import { PrismaClient } from "@prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const meds = [
  { name: "Amoxicillin", dosage: "500mg", form: "capsule" },
  { name: "Ibuprofen", dosage: "400mg", form: "tablet" },
  { name: "Paracetamol", dosage: "500mg", form: "tablet" },
  { name: "Metformin", dosage: "850mg", form: "tablet" },
  { name: "Omeprazole", dosage: "20mg", form: "capsule" },
  { name: "Amlodipine", dosage: "5mg", form: "tablet" },
  { name: "Atorvastatin", dosage: "20mg", form: "tablet" },
  { name: "Losartan", dosage: "50mg", form: "tablet" },
  { name: "Metoprolol", dosage: "50mg", form: "tablet" },
  { name: "Ciprofloxacin", dosage: "500mg", form: "tablet" },
  { name: "Azithromycin", dosage: "250mg", form: "tablet" },
  { name: "Doxycycline", dosage: "100mg", form: "capsule" },
  { name: "Cetirizine", dosage: "10mg", form: "tablet" },
  { name: "Loratadine", dosage: "10mg", form: "tablet" },
  { name: "Prednisolone", dosage: "5mg", form: "tablet" },
  { name: "Dexamethasone", dosage: "4mg", form: "tablet" },
  { name: "Salbutamol", dosage: "100mcg", form: "inhaler" },
  { name: "Fluticasone", dosage: "250mcg", form: "inhaler" },
  { name: "Insulin Glargine", dosage: "100IU/ml", form: "injection" },
  { name: "Metoclopramide", dosage: "10mg", form: "tablet" },
  { name: "Ondansetron", dosage: "4mg", form: "tablet" },
  { name: "Diclofenac", dosage: "50mg", form: "tablet" },
  { name: "Tramadol", dosage: "50mg", form: "capsule" },
  { name: "Morphine", dosage: "10mg", form: "injection" },
  { name: "Furosemide", dosage: "40mg", form: "tablet" },
  { name: "Spironolactone", dosage: "25mg", form: "tablet" },
  { name: "Hydrochlorothiazide", dosage: "25mg", form: "tablet" },
  { name: "Warfarin", dosage: "5mg", form: "tablet" },
  { name: "Aspirin", dosage: "100mg", form: "tablet" },
  { name: "Clopidogrel", dosage: "75mg", form: "tablet" },
  { name: "Enalapril", dosage: "10mg", form: "tablet" },
  { name: "Lisinopril", dosage: "10mg", form: "tablet" },
  { name: "Ramipril", dosage: "5mg", form: "capsule" },
  { name: "Simvastatin", dosage: "20mg", form: "tablet" },
  { name: "Rosuvastatin", dosage: "10mg", form: "tablet" },
  { name: "Levothyroxine", dosage: "50mcg", form: "tablet" },
  { name: "Carbimazole", dosage: "5mg", form: "tablet" },
  { name: "Glimepiride", dosage: "2mg", form: "tablet" },
  { name: "Gliclazide", dosage: "80mg", form: "tablet" },
  { name: "Pioglitazone", dosage: "15mg", form: "tablet" },
  { name: "Sitagliptin", dosage: "100mg", form: "tablet" },
  { name: "Empagliflozin", dosage: "10mg", form: "tablet" },
  { name: "Liraglutide", dosage: "1.2mg", form: "injection" },
  { name: "Gabapentin", dosage: "300mg", form: "capsule" },
  { name: "Pregabalin", dosage: "75mg", form: "capsule" },
  { name: "Carbamazepine", dosage: "200mg", form: "tablet" },
  { name: "Sodium Valproate", dosage: "500mg", form: "tablet" },
  { name: "Phenytoin", dosage: "100mg", form: "capsule" },
  { name: "Sertraline", dosage: "50mg", form: "tablet" },
  { name: "Fluoxetine", dosage: "20mg", form: "capsule" },
  { name: "Escitalopram", dosage: "10mg", form: "tablet" },
  { name: "Amitriptyline", dosage: "25mg", form: "tablet" },
  { name: "Clonazepam", dosage: "0.5mg", form: "tablet" },
  { name: "Diazepam", dosage: "5mg", form: "tablet" },
  { name: "Alprazolam", dosage: "0.5mg", form: "tablet" },
  { name: "Risperidone", dosage: "2mg", form: "tablet" },
  { name: "Olanzapine", dosage: "10mg", form: "tablet" },
  { name: "Haloperidol", dosage: "5mg", form: "tablet" },
  { name: "Ranitidine", dosage: "150mg", form: "tablet" },
  { name: "Pantoprazole", dosage: "40mg", form: "tablet" },
  { name: "Esomeprazole", dosage: "40mg", form: "capsule" },
  { name: "Domperidone", dosage: "10mg", form: "tablet" },
  { name: "Loperamide", dosage: "2mg", form: "capsule" },
  { name: "Bisacodyl", dosage: "5mg", form: "tablet" },
  { name: "Lactulose", dosage: "15ml", form: "syrup" },
  { name: "Ferrous Sulfate", dosage: "200mg", form: "tablet" },
  { name: "Folic Acid", dosage: "5mg", form: "tablet" },
  { name: "Vitamin B12", dosage: "1000mcg", form: "injection" },
  { name: "Vitamin D3", dosage: "1000IU", form: "capsule" },
  { name: "Calcium Carbonate", dosage: "500mg", form: "tablet" },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const med of meds) {
    try {
      await prisma.medication.create({ data: med });
      created++;
    } catch {
      skipped++;
    }
  }
  console.log(`Done: ${created} created, ${skipped} skipped (already exist)`);
  await prisma.$disconnect();
  await pool.end();
}

main();
