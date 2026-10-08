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

  it("Should return 400 with extra fields in the request body", async () => {
    const patientData = {
      name: "Pongo",
      species: "Dog",
      extraField: "ignored",
    };
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient");
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

  it("Should return 400 with missing required fields", async () => {
    const patientData = { name: "Pongo" }; // Missing species
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["species"],
        }),
      ]),
    );
  });

  it("Should return 400 with invalid name", async () => {
    const patientData = { name: 123, species: "Dog" }; // Invalid name type
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["name"],
        }),
      ]),
    );
  });

  it("Should return 400 with invalid species", async () => {
    const patientData = { name: "Pongo", species: 123 }; // Invalid species type
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["species"],
        }),
      ]),
    );
  });

  it("Should return 400 if id is inlcuded in POST", async () => {
    const patientData = { id: randomUUID(), name: "Pongo", species: "Dog" }; // ID should not be included in POST
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["id"],
        }),
      ]),
    );
  });

  it("Should return 400 if name is empty", async () => {
    const patientData = { name: "", species: "Dog" }; // Empty name
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["name"],
        }),
      ]),
    );
  });

  it("Should return 400 if species is empty", async () => {
    const patientData = { name: "Pongo", species: "" }; // Empty species
    const response = await request(app).post("/patients").send(patientData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["species"],
        }),
      ]),
    );
  });
});
