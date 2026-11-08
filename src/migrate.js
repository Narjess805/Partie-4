import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const client = new pg.Client();
await client.connect();
await client.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())"
);
const dir = path.resolve("migrations");
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const done = await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [f]);
  if (done.rowCount) { console.log(`skip ${f}`); continue; }
  await client.query("BEGIN");
  try {
    await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
    await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f]);
    await client.query("COMMIT");
    console.log(`applied ${f}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
await client.end();
