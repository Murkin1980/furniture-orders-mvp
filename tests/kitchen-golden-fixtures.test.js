import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const validPlan = JSON.parse(readFileSync(join(__dirname, "fixtures", "kitchen-valid-plan.json"), "utf-8"));
const invalidPlan = JSON.parse(readFileSync(join(__dirname, "fixtures", "kitchen-invalid-plan.json"), "utf-8"));

import { validateKitchenCommandPlan } from "../src/sketchup/kitchen-command-plan.js";

describe("Golden fixtures — kitchen-command-plan validation", () => {
  it("valid plan passes all JS validations", () => {
    const r = validateKitchenCommandPlan(validPlan);
    assert.equal(r.ok, true, `Valid plan rejected: ${r.message}`);
    assert.equal(validPlan.planVersion, "kitchen-command-plan/v1");
    assert.ok(validPlan.commands.length >= 5);
  });

  it("invalid plan fails JS validation", () => {
    const r = validateKitchenCommandPlan(invalidPlan);
    assert.equal(r.ok, false);
    // Plan has: create_room_envelope without wallAmm (invalid_envelope),
    // place_block_module with wall "x" (invalid_command_payload),
    // place_block_module with kind "custom-invalid" (disallowed_module_kind),
    // place_block_appliance with kind "unknown_appliance" (disallowed_appliance_kind)
    // Any of these errors is correct
    const validErrors = ["invalid_envelope", "invalid_command_payload", "disallowed_module_kind", "disallowed_appliance_kind"];
    assert.ok(validErrors.includes(r.error), `Unexpected error: ${r.error} — ${r.message}`);
  });

  it("invalid plan has command types in kitchen allowlist but fails on payload", () => {
    const kitchenCommands = new Set(["set_units_mm", "create_room_envelope", "place_block_module", "place_block_appliance"]);
    // All command types are syntactically in the allowlist
    for (const cmd of invalidPlan.commands) {
      assert.ok(kitchenCommands.has(cmd.type), `Command type "${cmd.type}" should be in allowlist`);
    }
    // But payload validation fails (no wallAmm, bad wall "x", bad kind "custom-invalid")
    // The JS validator already confirms this
    const r = validateKitchenCommandPlan(invalidPlan);
    assert.equal(r.ok, false);
  });

  it("valid plan commands are all in kitchen allowlist", () => {
    const kitchenCommands = new Set(["set_units_mm", "create_room_envelope", "place_block_module", "place_block_appliance"]);
    const moduleKinds = new Set(["sink-base", "drawers", "base-cabinet", "corner-base", "oven-base", "fridge-box", "wall-cabinet", "hood-cabinet"]);
    const applianceKinds = new Set(["sink", "hob", "oven", "fridge", "dishwasher", "hood"]);

    for (const cmd of validPlan.commands) {
      assert.ok(kitchenCommands.has(cmd.type), `Command "${cmd.type}" not allowed`);
      if (cmd.type === "place_block_module") {
        assert.ok(moduleKinds.has(cmd.kind), `Module kind "${cmd.kind}" not allowed`);
        assert.ok(["a", "b", "c"].includes(cmd.wall), `Wall "${cmd.wall}" not allowed`);
      }
      if (cmd.type === "place_block_appliance") {
        assert.ok(applianceKinds.has(cmd.kind), `Appliance kind "${cmd.kind}" not allowed`);
      }
    }
  });
});
