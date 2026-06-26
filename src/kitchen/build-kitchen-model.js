import { normalizeKitchenBrief } from "./brief.js";
import { getDefaultKitchenModel, READINESS, validateKitchenModel } from "./model.js";

const SUPPORTED_LAYOUTS = new Set(["straight", "l"]);
const APPLIANCE_DEFAULTS = {
  sink: { widthMm: 800, heightMm: 720, depthMm: 560 },
  hob: { widthMm: 600, heightMm: 60, depthMm: 520 },
  oven: { widthMm: 600, heightMm: 600, depthMm: 560 },
  fridge: { widthMm: 600, heightMm: 2000, depthMm: 650 },
  dishwasher: { widthMm: 600, heightMm: 820, depthMm: 570 },
  hood: { widthMm: 600, heightMm: 150, depthMm: 500 }
};

export function buildKitchenModel(input = {}) {
  const normalized = normalizeKitchenBrief(input);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error, model: getDefaultKitchenModel() };
  }

  const brief = normalized.brief;
  const model = getDefaultKitchenModel();
  const warnings = [...(normalized.warnings || [])];

  if (!SUPPORTED_LAYOUTS.has(brief.kitchen.layout)) {
    return { ok: false, error: `Layout "${brief.kitchen.layout}" is not yet supported. Supported: straight, l.`, model };
  }

  if (brief.kitchen.layout === "l" && !brief.kitchen.room.wallBmm) {
    return { ok: false, error: "L-shaped layout requires wallB length.", model };
  }

  model.layout = brief.kitchen.layout;
  model.roomEnvelope = {
    wallAmm: brief.kitchen.room.wallAmm,
    wallBmm: brief.kitchen.room.wallBmm,
    ceilingHeightMm: brief.kitchen.room.ceilingHeightMm
  };

  const walls = buildWalls(brief);
  model.walls = walls;

  // Single occupancy pass: reserve space for modules and appliances on each wall
  const wallOccupancy = {};
  for (const wall of walls) {
    wallOccupancy[wall.id] = { modules: [], availableFrom: 0 };
  }

  for (const mod of brief.kitchen.modules || []) {
    const wall = mod.wall || "A";
    if (!wallOccupancy[wall]) {
      warnings.push(`Module references unknown wall "${wall}", skipping.`);
      continue;
    }
    if (!mod.widthMm) {
      warnings.push(`Module "${mod.type}" has no width — skipping.`);
      continue;
    }

    const occupancy = wallOccupancy[wall];
    const xMm = occupancy.availableFrom;

    if (xMm + mod.widthMm > walls.find((w) => w.id === wall).lengthMm) {
      warnings.push(`Module ${mod.type} (${mod.widthMm}mm) does not fit on wall ${wall} (remaining ${walls.find((w) => w.id === wall).lengthMm - xMm}mm).`);
      continue;
    }

    const depthMm = mod.depthMm || (mod.zone === "wall" ? 320 : 560);
    const block = {
      id: `${mod.zone}-${xMm}`,
      wall,
      kind: mod.type,
      xMm,
      widthMm: mod.widthMm,
      heightMm: mod.heightMm || 720,
      depthMm,
      _provisional: mod._provisional || {}
    };

    if (mod.zone === "wall") {
      block.mountBottomMm = brief.kitchen.room.ceilingHeightMm
        ? (brief.kitchen.room.ceilingHeightMm - (mod.heightMm || 720))
        : null;
      block._provisional.mountBottom = true;
      model.wallModules.push(block);
    } else {
      model.baseModules.push(block);
    }

    occupancy.availableFrom = xMm + mod.widthMm;
    occupancy.modules.push(block);
  }

  // Build appliance blocks, reserving space in same occupancy
  const appliances = brief.kitchen.appliances || {};
  for (const [kind, enabled] of Object.entries(appliances)) {
    if (!enabled) continue;
    const defaults = APPLIANCE_DEFAULTS[kind];
    if (!defaults) { warnings.push(`Unknown appliance kind "${kind}".`); continue; }

    const targetWall = brief.kitchen.zones[`${kind}Wall`] || brief.kitchen.zones[`${kind}_wall`] || "A";
    if (!wallOccupancy[targetWall]) { warnings.push(`Appliance ${kind} references unknown wall "${targetWall}".`); continue; }

    const occupancy = wallOccupancy[targetWall];
    const xMm = occupancy.availableFrom;
    const wallLength = walls.find((w) => w.id === targetWall).lengthMm;

    if (xMm + defaults.widthMm > wallLength) {
      warnings.push(`Appliance ${kind} (${defaults.widthMm}mm) does not fit on wall ${targetWall} (remaining ${wallLength - xMm}mm).`);
      continue;
    }

    model.applianceBlocks.push({
      id: `${kind}-${xMm}`,
      wall: targetWall,
      kind,
      xMm,
      widthMm: defaults.widthMm,
      heightMm: defaults.heightMm,
      depthMm: defaults.depthMm,
      _provisional: { placement: true }
    });
    occupancy.availableFrom = xMm + defaults.widthMm;
  }

  // Compute metrics
  model.metrics = {
    baseRunMm: model.baseModules.reduce((s, m) => s + (m.widthMm || 0), 0),
    wallRunMm: model.wallModules.reduce((s, m) => s + (m.widthMm || 0), 0)
  };

  model.warnings = warnings;

  // Validate and set readiness
  const validation = validateKitchenModel(model);
  model.readiness = validation.readiness;

  return { ok: true, error: "", model };
}

function buildWalls(brief) {
  const walls = [];
  if (brief.kitchen.room.wallAmm) walls.push({ id: "A", lengthMm: brief.kitchen.room.wallAmm });
  if (brief.kitchen.room.wallBmm) walls.push({ id: "B", lengthMm: brief.kitchen.room.wallBmm });
  if (brief.kitchen.room.wallCmm) walls.push({ id: "C", lengthMm: brief.kitchen.room.wallCmm });
  if (walls.length === 0) walls.push({ id: "A", lengthMm: 0 });
  return walls;
}
