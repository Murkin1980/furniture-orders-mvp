import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const RUBY_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "ruby");

function readSource(name) {
  const p = join(RUBY_DIR, name);
  return readFileSync(p, "utf-8");
}

describe("EasyKitchen presets — strict mode", () => {
  it("registry contains all 14 kitchen components", () => {
    const registry = readSource("kitchen_preset_registry.rb");
    const keys = [
      "sink-base", "drawers", "base-cabinet", "corner-base", "oven-base",
      "fridge-box", "wall-cabinet", "hood-cabinet",
      "sink", "hob", "oven", "fridge", "dishwasher", "hood"
    ];
    for (const key of keys) {
      assert.match(registry, new RegExp(`"${key}"\\s*=>`), `Missing preset for ${key}`);
    }
  });

  it("registry has structured entries with ek_preset_id, version, library", () => {
    const registry = readSource("kitchen_preset_registry.rb");
    assert.match(registry, /ek_preset_id/);
    assert.match(registry, /version/);
    assert.match(registry, /library/);
  });

  it("registry has resolve_ek_preset! with strict: true raising error", () => {
    const registry = readSource("kitchen_preset_registry.rb");
    assert.match(registry, /resolve_ek_preset!/);
    assert.match(registry, /PresetUnavailableForModule/);
    assert.match(registry, /strict: true/);
  });

  it("registry has DEMO_PRESET_IDS", () => {
    const registry = readSource("kitchen_preset_registry.rb");
    assert.match(registry, /DEMO_PRESET_IDS/);
  });

  it("adapter uses resolve_ek_preset! instead of internal maps", () => {
    const adapter = readSource("kitchen_easykitchen_adapter.rb");
    assert.match(adapter, /resolve_ek_preset!/);
    assert.match(adapter, /strict: true/);
    assert.match(adapter, /build_demo_placeholder/);
    // No internal preset maps
    assert.doesNotMatch(adapter, /EK_PRESET_MAP/);
    assert.doesNotMatch(adapter, /COMPONENT_MAP/);
  });

  it("adapter raises when EasyKitchen not available in strict mode", () => {
    const adapter = readSource("kitchen_easykitchen_adapter.rb");
    assert.match(adapter, /EasyKitchen is not available/);
    assert.match(adapter, /raise/);
  });

  it("adapter demo path is explicitly not for production", () => {
    const adapter = readSource("kitchen_easykitchen_adapter.rb");
    assert.match(adapter, /demo only, not for production/);
    assert.match(adapter, /block geometry/);
  });
});
