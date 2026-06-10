import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const tables = await sql`SELECT tablename, schemaname FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname, tablename;`;
    console.log('tables:', tables);

    // show columns for 'users' if it exists
    const usersCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;`;
    console.log('users columns:', usersCols);

    const sample = await sql`SELECT * FROM users LIMIT 1;`;
    console.log('users sample row:', sample[0] || null);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
