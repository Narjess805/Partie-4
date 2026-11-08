import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import pg from "pg";
import { createApp } from "../../src/app.js";
import { createPgContactRepository } from "../../src/repositories/contactRepository.js";

const pool = new pg.Pool();
const repo = createPgContactRepository(pool);
const app = createApp({ contactRepository: repo, rateLimitMax: 1000 });

beforeAll(async () => {
  await pool.query("DELETE FROM contacts WHERE email = 'int-test@example.com'");
});
afterAll(async () => {
  await pool.query("DELETE FROM contacts WHERE email = 'int-test@example.com'");
  await pool.end();
});

describe("intégration PostgreSQL", () => {
  it("insère un contact et le relit depuis la base", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({ name: "Test", email: "int-test@example.com", message: "Message d'intégration" });
    expect(res.status).toBe(201);

    const r = await pool.query("SELECT * FROM contacts WHERE email = $1", ["int-test@example.com"]);
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].name).toBe("Test");
  });

  it("l'injection SQL est stockée comme du texte, la table survit", async () => {
    const evil = "x'); DROP TABLE contacts;-- message long";
    const res = await request(app)
      .post("/api/contact")
      .send({ name: "Eve", email: "int-test@example.com", message: evil });
    expect(res.status).toBe(201);
    const r = await pool.query("SELECT count(*)::int AS n FROM contacts");
    expect(r.rows[0].n).toBeGreaterThan(0);
  });
});
