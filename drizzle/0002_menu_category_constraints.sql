UPDATE menu_items
SET category = CASE
  WHEN category IN ('麵食', '中式餐點', '西式餐點', '飲品') THEN category
  WHEN category IN ('吐司', '漢堡', '三明治', '西式', '西式餐點') THEN '西式餐點'
  WHEN category IN ('蛋餅', '點心', '飯糰', '中式', '中式餐點') THEN '中式餐點'
  WHEN category IN ('飲料', '飲品') THEN '飲品'
  WHEN category IN ('麵類') THEN '麵食'
  ELSE '中式餐點'
END;

ALTER TABLE menu_items
DROP CONSTRAINT IF EXISTS menu_items_category_check;

ALTER TABLE menu_items
ADD CONSTRAINT menu_items_category_check
CHECK (category IN ('麵食', '中式餐點', '西式餐點', '飲品'));
