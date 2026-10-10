import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { randomUUID } from "node:crypto";
import { calculateFlag, flagEnum } from "../src/flag.js";
import type { LabResultCreate } from "../src/schemas.js";

function createTestPatient() {
  return request(app).post("/patients").send({
    name: "Perdita",
    species: "Dog",
  });
}

async function createTestPatientId(): Promise<string> {
  return (await createTestPatient()).body.patient.id;
}

function buildTestLabResult(
  patientId: string,
  overrides: Partial<LabResultCreate> = {},
): LabResultCreate {
  return {
    patientId: patientId,
    testCode: "CBC",
    value: 123,
    unit: "cells/uL",
    referenceLow: 1,
    referenceHigh: 15,
    collectedAt: "2026-10-09T12:35:03.067Z",
    ...overrides,
  };
}

describe("Lab result endpoints", () => {
  it("Should return 201 and the stored result for a valid lab result", async () => {
    const labResult = buildTestLabResult(await createTestPatientId());

    // Create a lab result for the test patient
    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: {
        ...labResult,
        id: expect.any(String),
        flag: flagEnum.enum.HIGH,
      },
    });
  });

  it("Should return 404 if the patient is not found", async () => {
    const labResult = buildTestLabResult(randomUUID());

    // Attempt to create a lab result for a non-existent patient
    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Patient not found");
  });

  it("Should not require a reference range", async () => {
    const labResult = buildTestLabResult(await createTestPatientId(), {
      referenceHigh: undefined,
      referenceLow: undefined,
    });

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: {
        ...labResult,
        id: expect.any(String),
        flag: flagEnum.enum.UNKNOWN,
      },
    });
  });

  it("Should allow only reference low", async () => {
    const labResult = buildTestLabResult(await createTestPatientId(), {
      referenceHigh: undefined,
    });

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: {
        ...labResult,
        id: expect.any(String),
        flag: flagEnum.enum.NORMAL,
      },
    });
  });

  it("Should allow only reference high", async () => {
    const labResult = buildTestLabResult(await createTestPatientId(), {
      referenceLow: undefined,
    });

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: {
        ...labResult,
        id: expect.any(String),
        flag: flagEnum.enum.HIGH,
      },
    });
  });

  it("Should return 400 if the lab result is invalid", async () => {
    const labResult = {
      ...createTestPatientId(),
      value: null, // Invalid value
    };

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid lab result");
  });

  it("Should return 400 if the lab result is missing required fields", async () => {
    const labResult = {
      ...createTestPatientId(),
      value: undefined, // Missing value
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
    const labResult = {
      ...createTestPatientId(),
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
    const labResult = {
      ...createTestPatientId(),
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
    const labResult = {
      ...createTestPatientId(),
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
    const labResult = {
      ...createTestPatientId(),
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
    const labResult = {
      ...createTestPatientId(),
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
    const patientId = await createTestPatientId();
    const labResult1 = buildTestLabResult(patientId);
    const labResult2 = buildTestLabResult(patientId);

    const response1 = await request(app).post("/lab-results").send(labResult1);
    expect(response1.status).toBe(201);
    expect(response1.body).toEqual({
      labResult: {
        ...labResult1,
        id: expect.any(String),
        flag: flagEnum.enum.HIGH,
      },
    });

    const response2 = await request(app).post("/lab-results").send(labResult2);
    expect(response2.status).toBe(201);
    expect(response2.body).toEqual({
      labResult: {
        ...labResult2,
        id: expect.any(String),
        flag: flagEnum.enum.HIGH,
      },
    });
  });

  it("Should return 400 if reference low is greater than reference high in the request body", async () => {
    const labResult = buildTestLabResult(await createTestPatientId(), {
      referenceLow: 100,
      referenceHigh: 50, // Reference low is greater than reference high, should be rejected
    });

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
    const labResult = buildTestLabResult(await createTestPatientId(), {
      referenceLow: 100,
      referenceHigh: 50, // Reference low is greater than reference high, should be rejected
    });

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
    const labResult = buildTestLabResult(await createTestPatientId(), {
      collectedAt: "2020-01-01T06:15:00+02:00", // Time zone offset should not be accepted
    });

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

  it("Should calculate the flag value on request", async () => {
    const labResult = buildTestLabResult(await createTestPatientId(), {
      referenceLow: 50,
      referenceHigh: 100,
      value: 75,
    });

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: {
        ...labResult,
        id: expect.any(String),
        flag: flagEnum.enum.NORMAL,
      },
    });
  });

  it("Should return lab results for patient", async () => {
    const patientId = await createTestPatientId();
    const labResult1 = buildTestLabResult(patientId);
    const labResult2 = buildTestLabResult(patientId);

    await request(app).post("/lab-results").send(labResult1);
    await request(app).post("/lab-results").send(labResult2);

    const response = await request(app).get(`/patients/${patientId}/results`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      labResults: [
        { ...labResult1, id: expect.any(String), flag: flagEnum.enum.HIGH },
        { ...labResult2, id: expect.any(String), flag: flagEnum.enum.HIGH },
      ],
    });
  });

  it("Should return lab results most recent first", async () => {
    const patientId = await createTestPatientId();
    const labResult1 = buildTestLabResult(patientId);
    const labResult2 = buildTestLabResult(patientId);

    const labResult2DateTime = new Date(labResult2.collectedAt);
    labResult2DateTime.setSeconds(labResult2DateTime.getSeconds() + 30);
    labResult2.collectedAt = labResult2DateTime.toISOString();

    await request(app).post("/lab-results").send(labResult1);
    await request(app).post("/lab-results").send(labResult2);

    const response = await request(app).get(`/patients/${patientId}/results`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      labResults: [
        { ...labResult2, id: expect.any(String), flag: flagEnum.enum.HIGH },
        { ...labResult1, id: expect.any(String), flag: flagEnum.enum.HIGH },
      ],
    });
  });

  it("Should only return results from the requested patient", async () => {
    const patientId1 = await createTestPatientId();
    const patientId2 = await createTestPatientId();

    const labResult1 = buildTestLabResult(patientId1);
    const labResult2 = buildTestLabResult(patientId2);

    await request(app).post("/lab-results").send(labResult1);
    await request(app).post("/lab-results").send(labResult2);

    const response = await request(app).get(`/patients/${patientId2}/results`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      labResults: [
        { ...labResult2, id: expect.any(String), flag: flagEnum.enum.HIGH },
      ],
    });
  });

  it("Should return 200 with empty results list for valid patient without results", async () => {
    const patientId = await createTestPatientId();
    const response = await request(app).get(`/patients/${patientId}/results`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      labResults: [],
    });
  });

  it("Should return 404 if patient not found", async () => {
    const response = await request(app).get(
      `/patients/${randomUUID()}/results`,
    );
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Patient not found");
  });

  it("Should only return abnormal results with query param", async () => {
    const patientId = await createTestPatientId();
    const labResultNormal = buildTestLabResult(patientId, {
      referenceHigh: 10,
      referenceLow: 0,
      value: 5,
    });
    const labResultAbnormal = buildTestLabResult(patientId, {
      referenceHigh: 10,
      referenceLow: 0,
      value: 11,
    });
    const labResultNoRef = buildTestLabResult(patientId, {
      referenceHigh: undefined,
      referenceLow: undefined,
    });

    await request(app).post("/lab-results").send(labResultNormal);
    await request(app).post("/lab-results").send(labResultAbnormal);
    await request(app).post("/lab-results").send(labResultNoRef);

    const response = await request(app).get(
      `/patients/${patientId}/results?abnormal=true`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      labResults: [
        {
          ...labResultAbnormal,
          id: expect.any(String),
          flag: flagEnum.enum.HIGH,
        },
        {
          ...labResultNoRef,
          id: expect.any(String),
          flag: flagEnum.enum.UNKNOWN,
        },
      ],
    });
  });

  it("Should only return all results with query param == false", async () => {
    const patientId = await createTestPatientId();
    const labResultNormal = buildTestLabResult(patientId, {
      referenceHigh: 10,
      referenceLow: 0,
      value: 5,
    });
    const labResultAbnormal = buildTestLabResult(patientId, {
      referenceHigh: 10,
      referenceLow: 0,
      value: 11,
    });

    await request(app).post("/lab-results").send(labResultNormal);
    await request(app).post("/lab-results").send(labResultAbnormal);

    const response = await request(app).get(
      `/patients/${patientId}/results?abnormal=false`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      labResults: [
        {
          ...labResultNormal,
          id: expect.any(String),
          flag: flagEnum.enum.NORMAL,
        },
        {
          ...labResultAbnormal,
          id: expect.any(String),
          flag: flagEnum.enum.HIGH,
        },
      ],
    });
  });

  it("Should return 400 with invalid query param value", async () => {
    const patientId = await createTestPatientId();
    const response = await request(app).get(
      `/patients/${patientId}/results?abnormal=hello`,
    );
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid query parameter" });
  });

  it("Should return 400 with bad query param and invalid patient id", async () => {
    const response = await request(app).get(
      `/patients/${randomUUID()}/results?abnormal=hello`,
    );
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid query parameter" });
  });

  it("Should handle decimals correctly", async () => {
    const patientId = await createTestPatientId();
    const labResult = buildTestLabResult(patientId, {
      referenceHigh: 10.1,
      referenceLow: 0.1,
      value: 0.6,
    });

    const response = await request(app).post("/lab-results").send(labResult);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      labResult: {
        ...labResult,
        referenceLow: 0.1,
        referenceHigh: 10.1,
        value: 0.6,
        id: expect.any(String),
        flag: flagEnum.enum.NORMAL,
      },
    });
  });
});

describe("calculateFlag function", () => {
  it.each([
    [40, 50, 100, flagEnum.enum.LOW],
    [110, 50, 100, flagEnum.enum.HIGH],
    [75, 50, 100, flagEnum.enum.NORMAL],
    [110, undefined, 100, flagEnum.enum.HIGH],
    [40, 50, undefined, flagEnum.enum.LOW],
    [90, undefined, 100, flagEnum.enum.NORMAL],
    [75, 50, undefined, flagEnum.enum.NORMAL],
    [75, undefined, undefined, flagEnum.enum.UNKNOWN],
    [50, 50, 100, flagEnum.enum.NORMAL],
    [100, 50, 100, flagEnum.enum.NORMAL],
    [-60, -50, 0, flagEnum.enum.LOW],
    [-25, -50, 0, flagEnum.enum.NORMAL],
    [10, -50, 0, flagEnum.enum.HIGH],
    [-5, 0, 100, flagEnum.enum.LOW],
    [5, -100, 0, flagEnum.enum.HIGH],
  ])(
    `Should return the correct flag for value %s, referenceLow %s, referenceHigh %s`,
    (value, referenceLow, referenceHigh, expectedFlag) => {
      expect(calculateFlag(value, referenceLow, referenceHigh)).toBe(
        expectedFlag,
      );
    },
  );
});
