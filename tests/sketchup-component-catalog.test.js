import test from "node:test";
import assert from "node:assert/strict";
import {
  SKETCHUP_COMPONENT_CATALOG_VERSION,
  SKETCHUP_COMPONENT_PLACEMENT_VERSION,
  buildComponentPlacementPlan,
  normalizeComponentCatalog,
  normalizeComponentDefinition
} from "../src/sketchup/component-catalog.js";

test("normalizes a safe component catalog", () => {
  const catalog = normalizeComponentCatalog({
    components: [
      {
        id: "easy-door-001",
        name: "EasyKitchen hinged door",
        family: "door",
        source: "easykitchen",
        adapter_key: "easykitchen/door/hinged",
        aliases: ["doors", "hinged doors"],
        defaults: { widthMm: 450, glass: false },
        notes: ["Local licensed component reference"]
      }
    ]
  });

  assert.equal(catalog.catalogVersion, SKETCHUP_COMPONENT_CATALOG_VERSION);
  assert.equal(catalog.components[0].componentId, "easy-door-001");
  assert.equal(catalog.components[0].source, "easykitchen");
  assert.equal(catalog.components[0].adapterKey, "easykitchen/door/hinged");
  assert.deepEqual(catalog.components[0].aliases, ["EasyKitchen hinged door", "doors", "hinged doors"]);
  assert.deepEqual(catalog.components[0].defaults, { widthMm: 450, glass: false });
});

test("unsafe ids and duplicate components are ignored safely", () => {
  const catalog = normalizeComponentCatalog({
    components: [
      { id: "../bad", label: "Bad", family: "door" },
      { id: "shelf-001", label: "Shelf", family: "shelf" },
      { id: "shelf-001", label: "Shelf duplicate", family: "shelf" }
    ]
  });

  assert.equal(catalog.components.length, 1);
  assert.equal(catalog.components[0].componentId, "shelf-001");
  assert.match(catalog.warnings.join("\n"), /unsafe id/);
  assert.match(catalog.warnings.join("\n"), /Duplicate component/);
});

test("unknown enums fall back without throwing", () => {
  const component = normalizeComponentDefinition({
    id: "component-001",
    label: "Mystery",
    family: "unknown",
    source: "unknown"
  });

  assert.equal(component.family, "other");
  assert.equal(component.source, "in_house");
});

test("unsafe adapter key is stripped", () => {
  const warnings = [];
  const component = normalizeComponentDefinition({
    id: "component-002",
    label: "Unsafe adapter",
    adapterKey: "../secret"
  }, warnings);

  assert.equal(component.adapterKey, "");
  assert.match(warnings.join("\n"), /adapterKey was ignored/);
});

test("matches model component labels to catalog aliases", () => {
  const model = readyModel();
  const catalog = normalizeComponentCatalog({
    components: [
      { id: "door-001", label: "Door", family: "door", source: "easykitchen", adapterKey: "easykitchen/door", aliases: ["doors"] },
      { id: "shelf-001", label: "Shelf", family: "shelf", source: "in_house", aliases: ["shelves"] }
    ]
  });

  const plan = buildComponentPlacementPlan(model, catalog);

  assert.equal(plan.placementVersion, SKETCHUP_COMPONENT_PLACEMENT_VERSION);
  assert.equal(plan.readyForSketchUpAdapter, true);
  assert.deepEqual(plan.placements.map((placement) => placement.componentId), ["door-001", "shelf-001"]);
  assert.equal(plan.placements[0].placement, "metadata_only");
});

test("unmatched components keep the plan fail-closed", () => {
  const plan = buildComponentPlacementPlan(readyModel(), {
    components: [{ id: "door-001", label: "Door", aliases: ["doors"] }]
  });

  assert.equal(plan.readyForSketchUpAdapter, false);
  assert.equal(plan.placements.length, 1);
  assert.match(plan.warnings.join("\n"), /No catalog component matched "shelves"/);
});

test("placement plan preserves source audit", () => {
  const plan = buildComponentPlacementPlan(readyModel(), {
    components: [
      { id: "door-001", label: "Door", aliases: ["doors"] },
      { id: "shelf-001", label: "Shelf", aliases: ["shelves"] }
    ]
  });

  assert.deepEqual(plan.source, { orderId: 8, recognitionId: 1 });
  assert.equal(plan.sourceModelVersion, "furniture-model/v1");
});

test("helpers do not mutate inputs and do not return undefined", () => {
  const model = readyModel();
  const catalogInput = {
    components: [
      { id: "door-001", label: "Door", aliases: ["doors"], defaults: { badKey: undefined, widthMm: 500 } },
      { id: "shelf-001", label: "Shelf", aliases: ["shelves"] }
    ]
  };
  const modelSnapshot = structuredClone(model);
  const catalogSnapshot = structuredClone(catalogInput);

  const plan = buildComponentPlacementPlan(model, catalogInput);

  assert.deepEqual(model, modelSnapshot);
  assert.deepEqual(catalogInput, catalogSnapshot);
  assert.equal(JSON.stringify(plan).includes("undefined"), false);
});

function readyModel() {
  return {
    modelVersion: "furniture-model/v1",
    source: { orderId: 8, recognitionId: 1 },
    components: [
      { id: "component-1", label: "doors" },
      { id: "component-2", label: "shelves" }
    ]
  };
}
