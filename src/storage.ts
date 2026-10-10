import type { Patient, LabResult } from "./schemas.js";
import { prisma } from "./db.js";

async function retrievePatient(
  patientId: string,
): Promise<Patient | undefined> {
  return (
    (await prisma.patient.findUnique({ where: { id: patientId } })) ?? undefined
  );
}

async function retrieveLabResults(patientId: string): Promise<LabResult[]> {
  return (
    await prisma.labResult.findMany({
      where: { patientId: patientId },
      orderBy: { collectedAt: "desc" },
    })
  ).map((result): LabResult => ({
    ...result,
    referenceLow: result.referenceLow ?? undefined,
    referenceHigh: result.referenceHigh ?? undefined,
    collectedAt: result.collectedAt.toISOString(),
    flag: result.flag as LabResult["flag"],
  }));
}

async function storePatient(patient: Patient) {
  await prisma.patient.create({
    data: patient,
  });
}

async function storeLabResult(labResult: LabResult) {
  await prisma.labResult.create({
    data: {
      ...labResult,
      collectedAt: new Date(labResult.collectedAt),
    },
  });
}

export { retrievePatient, retrieveLabResults, storePatient, storeLabResult };
