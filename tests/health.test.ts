import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Health endpoint", () => {
  it("Should return a 200 status and 'ok' message", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({status: 'ok'});
  });

  it("Should return 404 with invalid endpoint", async () => {
    const response = await request(app).get("/invalid");
    expect(response.status).toBe(404);
  });
});
