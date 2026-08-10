UPDATE "categories"
SET "keywords" = array_append("keywords", 'home improvement')
WHERE "name" = 'shopping'
  AND NOT ("keywords" @> ARRAY['home improvement']::TEXT[]);
