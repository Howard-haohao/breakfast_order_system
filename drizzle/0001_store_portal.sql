ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp;

UPDATE "user"
SET "updatedAt" = COALESCE("updatedAt", "createdAt");

ALTER TABLE "user"
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE session
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

UPDATE session
SET token = COALESCE(token, id)
WHERE token IS NULL;

ALTER TABLE session
  ALTER COLUMN token SET NOT NULL;

ALTER TABLE account
  ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" timestamp,
  ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" timestamp,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

ALTER TABLE verification
  ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS cart_items (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id),
  menu_item_id integer NOT NULL REFERENCES menu_items(id),
  qty integer NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_menu_unique
ON cart_items (user_id, menu_item_id);
