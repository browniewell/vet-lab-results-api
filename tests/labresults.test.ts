import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { randomUUID } from "node:crypto";

function createTestPatient() {
  return request(app).post("/patients").send({
    name: "Perdita",
    species: "Dog",
  });
}

function buildTestLabResult(patientId: string) {
  return {
    patientId: patientId,
    testCode: "CBC",
    value: 123,
    unit: "cells/uL",
    referenceLow: 1,
    referenceHigh: 15,
    collectedAt: new Date().toISOString(),
  };
}

describe("Lab result endpoints", () => {
  it("Should return 201 and the stored result for a valid lab result", async () => {
    // Create the test patient
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = buildTestLabResult(patientId);

    // Create a lab result for the test patient
    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: { ...labResult, id: expect.any(String), flag: "UNKNOWN" },
    });
  });

  it("Should return 404 if the patient is not found", async () => {
    const labResult = buildTestLabResult(randomUUID());

    // Attempt to create a lab result for a non-existent patient
    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Patient not found");
  });

  // TODO: later tests might negate this one, like when we verify the flag getting
  // set when one range is missing or to UNKNOWN if they are both missing
  it("Should not require a reference range", async () => {
    const patientId = (await createTestPatient()).body.patient.id;

    const labResult = {
      ...buildTestLabResult(patientId),
      referenceLow: undefined,
      referenceHigh: undefined,
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: { ...labResult, id: expect.any(String), flag: "UNKNOWN" },
    });
  });

  it("Should allow only reference low", async () => {
    const patientId = (await createTestPatient()).body.patient.id;

    const labResult = {
      ...buildTestLabResult(patientId),
      referenceHigh: undefined,
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: { ...labResult, id: expect.any(String), flag: "UNKNOWN" },
    });
  });

  it("Should allow only reference high", async () => {
    const patientId = (await createTestPatient()).body.patient.id;

    const labResult = {
      ...buildTestLabResult(patientId),
      referenceLow: undefined,
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: { ...labResult, id: expect.any(String), flag: "UNKNOWN" },
    });
  });

  it("Should return 400 if the lab result is invalid", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = {
      ...buildTestLabResult(patientId),
      value: null, // Invalid value
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
  });

  it("Should return 400 if the lab result is missing required fields", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = {
      ...buildTestLabResult(patientId),
      value: undefined, // Missing required field
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["value"],
        }),
      ]),
    );
  });

  it("Should return 400 if test code is missing", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = {
      ...buildTestLabResult(patientId),
      testCode: undefined, // Missing required field
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["testCode"],
        }),
      ]),
    );
  });

  it("Should return 400 if units are missing", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = {
      ...buildTestLabResult(patientId),
      unit: undefined, // Missing required field
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["unit"],
        }),
      ]),
    );
  });

  it("Should return 400 if the type is incorrect", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = {
      ...buildTestLabResult(patientId),
      value: "invalid", // Invalid type for value, should be a number
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["value"],
        }),
      ]),
    );
  });

  it("Should return 400 if date/time is not in ISO 8601 format", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = {
      ...buildTestLabResult(patientId),
      collectedAt: "invalid-date", // Invalid date/time format should be rejected
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["collectedAt"],
        }),
      ]),
    );
  });

  it("Should return 400 if flag is included in POST", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = {
      ...buildTestLabResult(patientId),
      flag: "HIGH", // Flag should not be included in POST, should be rejected
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["flag"],
        }),
      ]),
    );
  });

  it("Should be able to create two lab results for the same patient", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult1 = buildTestLabResult(patientId);
    const labResult2 = buildTestLabResult(patientId);

    const response1 = await request(app).post("/lab-results").send(labResult1);
    expect(response1.status).toBe(201);
    expect(response1.body).toEqual({
      labResult: { ...labResult1, id: expect.any(String), flag: "UNKNOWN" },
    });

    const response2 = await request(app).post("/lab-results").send(labResult2);
    expect(response2.status).toBe(201);
    expect(response2.body).toEqual({
      labResult: { ...labResult2, id: expect.any(String), flag: "UNKNOWN" },
    });
  });

  it("Should return 400 if reference low is greater than reference high in the request body", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = buildTestLabResult(patientId);
    labResult.referenceLow = 100;
    labResult.referenceHigh = 50; // Reference low is greater than reference high, should be rejected

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["referenceLow"],
          message: "Reference low cannot be greater than reference high",
        }),
      ]),
    );
  });

  // Here we're verifying that the range validation runs before checking if the patient exists
  it("Should return 400 if invalid reference range and patient does not exist", async () => {
    const labResult = buildTestLabResult(randomUUID());
    labResult.referenceLow = 100;
    labResult.referenceHigh = 50; // Reference low is greater than reference high, should be rejected

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["referenceLow"],
          message: "Reference low cannot be greater than reference high",
        }),
      ]),
    );
  });

  it("Should not accept time zone offsets in the date field", async () => {
    const patientId = (await createTestPatient()).body.patient.id;
    const labResult = buildTestLabResult(patientId);
    labResult.collectedAt = "2020-01-01T06:15:00+02:00"; // Time zone offset should not be accepted

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["collectedAt"],
        }),
      ]),
    );
  });
});
