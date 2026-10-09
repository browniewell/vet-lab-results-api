import type { Patient, LabResult } from "./schemas.js";

// In-memory storage for patients and lab results
const patientMap = new Map<string, Patient>(); // Patient ID -> Patient
const labResultMap = new Map<string, LabResult>(); // Lab Result ID -> Lab Result

async function retrievePatient(
  patientId: string,
): Promise<Patient | undefined> {
  return patientMap.get(patientId);
}

async function retrieveLabResults(patientId: string): Promise<LabResult[]> {
  return Array.from(labResultMap.values())
    .filter((result) => result.patientId === patientId)
    .sort((a, b) => {
      return (
        new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
      );
    });
}

async function storePatient(patient: Patient) {
  patientMap.set(patient.id, patient);
}

async function storeLabResult(labResult: LabResult) {
  labResultMap.set(labResult.id, labResult);
}

export { retrievePatient, retrieveLabResults, storePatient, storeLabResult };
