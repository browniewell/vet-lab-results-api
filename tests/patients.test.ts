import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Patient creation endpoint", () => {
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

  it("Should ignore extra fields in the request body", async () => {
    const patientData = {
      name: "Pongo",
      species: "Dog",
      extraField: "ignored",
    };
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toEqual(201);
    expect(response.body).toEqual({
      patient: {
        id: expect.any(String),
        name: patientData.name,
        species: patientData.species,
      },
    });
  });
});
