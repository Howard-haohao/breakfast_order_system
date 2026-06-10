require('dotenv/config');
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const v = await client.query("SELECT to_regclass('public.verification') as exists_in_public, to_regclass('verification') as exists_unqualified;");
    console.log('verification check:', v.rows);
    const m = await client.query("SELECT tablename, schemaname FROM pg_tables WHERE tablename ILIKE '%migration%' OR tablename ILIKE '%migrate%';");
    console.log('migration tables:', m.rows);
    await client.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
