import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("quickstart documents optional OAuth setup", () => {
  const quickstart = readFileSync(join(process.cwd(), "QUICKSTART.md"), "utf8");

  assert.match(quickstart, /## Настройка OAuth \(опционально\)/);
});
