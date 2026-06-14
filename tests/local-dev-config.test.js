import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("local Pages dev uses the configured D1 binding", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8")
  );
  const devCommand = packageJson.scripts?.dev || "";

  assert.match(devCommand, /wrangler pages dev public/);
  assert.match(devCommand, /--persist-to=\.wrangler\/state/);
  assert.doesNotMatch(devCommand, /--d1\s+DB/);
});
