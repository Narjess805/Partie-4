import pg from "pg";

export function createPgContactRepository(pool = new pg.Pool()) {
  return {
    async create({ name, email, message }) {
      const r = await pool.query(
        "INSERT INTO contacts (name, email, message) VALUES ($1,$2,$3) RETURNING id, name, email, message, created_at",
        [name, email, message]
      );
      return r.rows[0];
    },
    async list({ limit, offset }) {
      const r = await pool.query(
        "SELECT id, name, email, message, created_at FROM contacts ORDER BY id DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      );
      return r.rows;
    },
    async close() { await pool.end(); },
  };
}

export function createMemoryContactRepository() {
  const rows = [];
  return {
    async create(data) {
      const row = { id: rows.length + 1, ...data, created_at: new Date().toISOString() };
      rows.push(row);
      return row;
    },
    async list({ limit, offset }) {
      return [...rows].reverse().slice(offset, offset + limit);
    },
  };
}
