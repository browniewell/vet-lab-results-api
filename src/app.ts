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

// Retrieve a patient with a given ID
app.get("/patients/:id", (req, res) => {
  const patientId = req.params.id;
  const patient = patientMap.get(patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }
  res.json({ patient });
});

// Create a new patient and add it to the patient map
app.post("/patients", (req, res) => {
  const patientId = randomUUID();
  const patient: Patient = {
    id: patientId,
    name: req.body.name,
    species: req.body.species,
  };

  patientMap.set(patientId, patient);

  res.status(201).json({
    patient,
  });
});

export default app;
