import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const text = (...codes) => String.fromCodePoint(...codes);

const categories = {
  noodle: text(0x9eb5, 0x98df),
  chinese: text(0x4e2d, 0x5f0f, 0x9910, 0x9ede),
  western: text(0x897f, 0x5f0f, 0x9910, 0x9ede),
  drinks: text(0x98f2, 0x54c1),
  toast: text(0x5410, 0x53f8),
  burger: text(0x6f22, 0x5821),
  sandwich: text(0x4e09, 0x660e, 0x6cbb),
  westLegacy: text(0x897f, 0x5f0f),
  eggCake: text(0x86cb, 0x9905),
  snack: text(0x9ede, 0x5fc3),
  riceRoll: text(0x98ef, 0x7cf0),
  chineseLegacy: text(0x4e2d, 0x5f0f),
  drinkLegacy: text(0x98f2, 0x6599),
  noodleLegacy: text(0x9eb5, 0x985e),
};

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const list = (values) => values.map(quote).join(', ');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }

  await sql.query(`
    UPDATE menu_items
    SET category = CASE
      WHEN category IN (${list([categories.noodle, categories.chinese, categories.western, categories.drinks])}) THEN category
      WHEN category IN (${list([categories.toast, categories.burger, categories.sandwich, categories.westLegacy, categories.western])}) THEN ${quote(categories.western)}
      WHEN category IN (${list([categories.eggCake, categories.snack, categories.riceRoll, categories.chineseLegacy, categories.chinese])}) THEN ${quote(categories.chinese)}
      WHEN category IN (${list([categories.drinkLegacy, categories.drinks])}) THEN ${quote(categories.drinks)}
      WHEN category IN (${list([categories.noodleLegacy])}) THEN ${quote(categories.noodle)}
      ELSE ${quote(categories.chinese)}
    END;
  `);

  await sql.query('ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;');

  await sql.query(`
    ALTER TABLE menu_items
    ADD CONSTRAINT menu_items_category_check
    CHECK (category IN (${list([categories.noodle, categories.chinese, categories.western, categories.drinks])}));
  `);

  const result = await sql.query('SELECT category, COUNT(*)::int AS count FROM menu_items GROUP BY category ORDER BY category;');
  const rows = Array.isArray(result) ? result : result.rows;
  console.log('menu category migration applied. Current categories:');
  console.table(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});