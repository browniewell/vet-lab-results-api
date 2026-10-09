import express from "express";
import { randomUUID } from "node:crypto";
import type { Patient, LabResult } from "./schemas.js";
import { patientCreateSchema, labResultCreateSchema } from "./schemas.js";
import { calculateFlag, isAbnormal } from "./flag.js";
import {
  retrievePatient,
  retrieveLabResults,
  storePatient,
  storeLabResult,
} from "./storage.js";

// Express app setup
const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Retrieve a patient with a given ID
app.get("/patients/:id", async (req, res) => {
  const patientId = req.params.id;
  const patient = await retrievePatient(patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }
  res.json({ patient });
});

// GET endpoint for retrieving all lab results for a patient
app.get("/patients/:id/results", async (req, res) => {
  const patientId = req.params.id;
  const abnormalFlag = req.query.abnormal;
  if (
    abnormalFlag !== "true" &&
    abnormalFlag !== "false" &&
    abnormalFlag !== undefined
  ) {
    return res.status(400).json({ message: "Invalid query parameter" });
  }
  const patient = await retrievePatient(patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  // Get all test results for the patient
  let filteredResults = await retrieveLabResults(patientId);
  if (abnormalFlag === "true") {
    filteredResults = filteredResults.filter((result) =>
      isAbnormal(result.flag),
    );
  }
  return res.status(200).json({ labResults: filteredResults });
});

// POST endpoint for creating a new patient
app.post("/patients", async (req, res) => {
  const parsed = patientCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid patient", errors: parsed.error.issues });
  }
  const patientData = parsed.data;
  const patientId = randomUUID();
  const patient: Patient = {
    ...patientData,
    id: patientId,
  };

  await storePatient(patient);
  res.status(201).json({
    patient,
  });
});

// POST endpoint for creating a new lab result
app.post("/lab-results", async (req, res) => {
  const parsed = labResultCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid lab result", errors: parsed.error.issues });
  }

  const createdLabResult = parsed.data;
  const labResult: LabResult = {
    ...createdLabResult,
    id: randomUUID(),
    flag: calculateFlag(
      createdLabResult.value,
      createdLabResult.referenceLow,
      createdLabResult.referenceHigh,
    ),
  };

  // Find the patient which belongs to the lab result
  const patient = await retrievePatient(labResult.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  await storeLabResult(labResult);
  res.status(201).json({ labResult });
});

export default app;
