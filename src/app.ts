import express from "express";
import { randomUUID } from "node:crypto";

type Patient = {
  id: string;
  name: string;
  species: string;
};

const patientMap = new Map<string, Patient>();
const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create a new patient and add it to the patient map
app.post("/patients", (req, res) => {
  // TODO: Validate the patient data before storing it

  const patientId = randomUUID();
  const patient: Patient = {
    id: patientId,
    name: req.body.name,
    species: req.body.species,
  };

  patientMap.set(patientId, patient);

  res.status(201).json({
    patient: patient,
  });
});

export default app;
