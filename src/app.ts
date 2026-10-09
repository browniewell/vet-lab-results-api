import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { calculateFlag, flagEnum, isAbnormal } from "./flag.js";

// Zod schema for patient validation
const patientCreateSchema = z
  .object({
    name: z.string().nonempty(),
    species: z.string().nonempty(),
  })
  .strict();
const patientSchema = patientCreateSchema.extend({
  id: z.uuid(),
});
type Patient = z.infer<typeof patientSchema>;

// Zod schema for lab result validation
const labResultCreateSchema = z
  .object({
    patientId: z.uuid(),
    testCode: z.string().nonempty(),
    value: z.number(),
    unit: z.string().nonempty(),
    referenceLow: z.number().optional(),
    referenceHigh: z.number().optional(),
    collectedAt: z.iso.datetime(),
  })
  .refine(
    (data) => {
      if (data.referenceLow !== undefined && data.referenceHigh !== undefined) {
        return data.referenceLow <= data.referenceHigh;
      }
      return true;
    },
    {
      error: "Reference low cannot be greater than reference high",
      path: ["referenceLow"],
    },
  )
  .strict();
const labResultSchema = labResultCreateSchema.extend({
  id: z.uuid(),
  flag: flagEnum,
});
type LabResult = z.infer<typeof labResultSchema>;
type LabResultCreate = z.infer<typeof labResultCreateSchema>;

// In-memory storage for patients and lab results
const patientMap = new Map<string, Patient>(); // Patient ID -> Patient
const labResultMap = new Map<string, LabResult>(); // Lab Result ID -> Lab Result

// Express app setup
const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Retrieve a patient with a given ID
app.get("/patients/:id", (req, res) => {
  const patientId = req.params.id;
  const patient = patientMap.get(patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }
  res.json({ patient });
});

// GET endpoint for retrieving all lab results for a patient
app.get("/patients/:id/results", (req, res) => {
  const patientId = req.params.id;
  const abnormalFlag = req.query.abnormal;
  if (
    abnormalFlag !== "true" &&
    abnormalFlag !== "false" &&
    abnormalFlag !== undefined
  ) {
    return res.status(400).json({ message: "Invalid query parameter" });
  }
  const patient = patientMap.get(patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  // Get all test results for the patient
  let filteredResults = Array.from(labResultMap.values())
    .filter((result) => result.patientId === patientId)
    .sort((a, b) => {
      return (
        new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
      );
    });

  if (abnormalFlag === "true") {
    filteredResults = filteredResults.filter((result) =>
      isAbnormal(result.flag),
    );
    return res.status(200).json({ labResults: filteredResults });
  } else if (abnormalFlag === "false" || abnormalFlag === undefined) {
    return res.status(200).json({ labResults: filteredResults });
  }
});

// POST endpoint for creating a new patient
app.post("/patients", (req, res) => {
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

  patientMap.set(patientId, patient);

  res.status(201).json({
    patient,
  });
});

// POST endpoint for creating a new lab result
app.post("/lab-results", (req, res) => {
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
  const patient = patientMap.get(labResult.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  labResultMap.set(labResult.id, labResult); // Store the lab result in the map with the key
  res.status(201).json({ labResult });
});

export default app;
export type { LabResultCreate };
