import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { randomUUID } from "node:crypto";

describe("Patient endpoints", () => {
  it("Should return a 201 status and the patient created", async () => {
    const patientData = { name: "Pongo", species: "Dog" };
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      patient: {
        id: expect.any(String),
        name: patientData.name,
        species: patientData.species,
      },
    });
  });

  // TODO: Story 5 will start to reject requests with extra fields
  it("Should ignore extra fields in the request body", async () => {
    const patientData = {
      name: "Pongo",
      species: "Dog",
      extraField: "ignored",
    };
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      patient: {
        id: expect.any(String),
        name: patientData.name,
        species: patientData.species,
      },
    });
  });

  it("Should return a patient with a given ID", async () => {
    const patientData = { name: "Pongo", species: "Dog" };
    const response = await request(app).post("/patients").send(patientData);
    const patientId = response.body.patient.id;
    const getResponse = await request(app).get(`/patients/${patientId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toEqual({
      patient: {
        id: patientId,
        name: patientData.name,
        species: patientData.species,
      },
    });
  });

  it("Should return a 404 status if the patient is not found", async () => {
    const response = await request(app).get(`/patients/${randomUUID()}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Patient not found" });
  });

  it("Should return unique IDs for each patient", async () => {
    const patientData1 = { name: "Pongo", species: "Dog" };
    const response1 = await request(app).post("/patients").send(patientData1);
    const patientId1 = response1.body.patient.id;

    const patientData2 = { name: "Patch", species: "Dog" };
    const response2 = await request(app).post("/patients").send(patientData2);
    const patientId2 = response2.body.patient.id;

    expect(patientId1).not.toBe(patientId2);
  });
});
