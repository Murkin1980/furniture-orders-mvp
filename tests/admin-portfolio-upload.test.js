import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("portfolio create form exposes first-photo upload control", async () => {
  const html = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
  assert.match(html, /name="photo"\s+type="file"/);
  assert.match(html, /image\/jpeg,image\/png,image\/webp/);
});

test("portfolio create flow uploads selected photo after item creation", async () => {
  const script = await readFile(new URL("../public/admin.js", import.meta.url), "utf8");
  assert.match(script, /portfolioForm\.elements\.photo\?\.files\?\.\[0\]/);
  assert.match(script, /await uploadPortfolioFile\(json\.item\.id, photo\)/);
  assert.match(script, /function uploadPortfolioFile\(itemId, file\)/);
});
