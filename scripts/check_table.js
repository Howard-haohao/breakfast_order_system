import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const [v] = await sql`SELECT to_regclass('public.verification') as exists_in_public, to_regclass('verification') as exists_unqualified;`;
    console.log('verification check:', v);
    const migrationTables = await sql.query("SELECT tablename, schemaname FROM pg_tables WHERE tablename ILIKE '%migration%' OR tablename ILIKE '%migrate%';");
    console.log('migration tables:', migrationTables.rows);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
