# Patient Medical Records Schema

## PersonalHistory Model

All patient information stored in one model:

```prisma
model PersonalHistory {
  id            String    @id @default(cuid())
  patientId     String    @unique @map("patient_id")

  // Demographics
  fullName      String    @map("full_name")
  phoneNumber   String    @map("phone_number")
  dateOfBirth   DateTime? @map("date_of_birth") @db.Date
  sex           String?
  maritalStatus String?   @map("marital_status")
  offsprings    Int?
  occupation    String?
  residence     String?

  // Medical History (simple notes)
  presentHistory String? @map("present_history")
  pastHistory    String? @map("past_history")
  familyHistory  String? @map("family_history")

  // General Appearance
  built        String?
  behavior     String?
  intelligence String?
  facies       String?
  decubitus    String?

  // General Examination
  bloodPressure    String? @map("blood_pressure")
  pulse            String?
  supine           String?
  respRate         String? @map("resp_rate")
  temperature      String?
  headAndNeck      String? @map("head_and_neck")
  lymphNodes       String? @map("lymph_nodes")
  neckVeins        String? @map("neck_veins")
  thyroid          String?
  upperLimb        String? @map("upper_limb")
  lowerLimb        String? @map("lower_limb")
  peripheralPulse  String? @map("peripheral_pulse")
  cardioExam       String? @map("cardio_exam")
  chestExam        String? @map("chest_exam")
  abdomenExam      String? @map("abdomen_exam")
  neuroExam        String? @map("neuro_exam")
  provisionalDx    String? @map("provisional_dx")
  comments         String?

  patient Patient @relation(fields: [patientId], references: [id])

  @@index([phoneNumber])
  @@index([fullName])
  @@map("personal_histories")
}
```

## PreviousMedication Model

Medications patient arrived with (NOT prescriptions):

```prisma
model PreviousMedication {
  id        String  @id @default(cuid())
  patientId String  @map("patient_id")
  drug      String
  frequency String

  patient Patient @relation(fields: [patientId], references: [id])

  @@map("previous_medications")
}
```

## Investigation Model

With file attachment support:

```prisma
model Investigation {
  id        String   @id @default(cuid())
  patientId String   @map("patient_id")
  date      DateTime @db.Date
  invest    String
  report    String?
  fileUrl   String?  @map("file_url")
  fileName  String?  @map("file_name")

  patient Patient @relation(fields: [patientId], references: [id])

  @@map("investigations")
}
```

## Patient Model Update

```prisma
model Patient {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  personalHistory      PersonalHistory?
  previousMedications  PreviousMedication[]
  investigations       Investigation[]
  appointments         Appointment[]

  @@map("patients")
}
```
