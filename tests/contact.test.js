import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMemoryContactRepository } from "../src/repositories/contactRepository.js";

const valid = { name: "Ada", email: "ada@example.com", message: "Bonjour le monde" };
const mk = (opts = {}) =>
  createApp({
    contactRepository: createMemoryContactRepository(),
    rateLimitMax: 1000,
    ...opts,
  });

describe("POST /api/contact", () => {
  it("201 sur une requête valide", async () => {
    const res = await request(mk()).post("/api/contact").send(valid);
    expect(res.status).toBe(201);
  });

  it("GET /api/health", async () => {
    const res = await request(mk()).get("/api/health");
    expect(res.status).toBe(200);
  });

  it("400 VALIDATION_ERROR si email invalide", async () => {
    const res = await request(mk()).post("/api/contact").send({ ...valid, email: "pas-un-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.details[0].field).toBe("email");
  });

  it("400 si champ manquant", async () => {
    const res = await request(mk()).post("/api/contact").send({ name: "Ada" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("400 si champ en trop (mass assignment)", async () => {
    const res = await request(mk()).post("/api/contact").send({ ...valid, role: "admin" });
    expect(res.status).toBe(400);
  });

  it("400 si type inattendu", async () => {
    const res = await request(mk()).post("/api/contact").send({ ...valid, name: 42 });
    expect(res.status).toBe(400);
  });

  it("injection SQL : jamais de 500", async () => {
    const res = await request(mk())
      .post("/api/contact")
      .send({ ...valid, message: "x'); DROP TABLE contacts;-- fin du message" });
    expect(res.status).not.toBe(500);
  });

  it("400 INVALID_JSON sur JSON tronqué", async () => {
    const res = await request(mk())
      .post("/api/contact")
      .set("Content-Type", "application/json")
      .send('{"name": "Ada",');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_JSON");
  });

  it("413 PAYLOAD_TOO_LARGE au-delà de 10 kb", async () => {
    const res = await request(mk())
      .post("/api/contact")
      .send({ ...valid, message: "a".repeat(20000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("PAYLOAD_TOO_LARGE");
  });

  it("500 sans fuite d'information", async () => {
    const boom = { create: async () => { throw new Error("secret-db-password"); } };
    const res = await request(mk({ contactRepository: boom })).post("/api/contact").send(valid);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "INTERNAL_ERROR" });
    expect(JSON.stringify(res.body)).not.toMatch(/secret|stack/);
  });

  it("429 après dépassement du rate limit", async () => {
    const app = mk({ rateLimitMax: 3 });
    const codes = [];
    for (let i = 0; i < 5; i++) {
      codes.push((await request(app).post("/api/contact").send(valid)).status);
    }
    expect(codes).toEqual([201, 201, 201, 429, 429]);
  });
});

describe("autres routes", () => {
  it("404 JSON", async () => {
    const res = await request(mk()).get("/nimporte-quoi");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "NOT_FOUND" });
  });

  it("pas de x-powered-by", async () => {
    const res = await request(mk()).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
