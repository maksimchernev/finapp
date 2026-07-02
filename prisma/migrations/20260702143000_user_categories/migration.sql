ALTER TABLE "categories" ADD COLUMN "userId" TEXT;

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "categories_userId_idx" ON "categories"("userId");
