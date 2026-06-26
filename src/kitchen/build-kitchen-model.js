import { normalizeKitchenBrief, LAYOUT_TYPES, MODULE_TYPES } from "./brief.js";
import { getDefaultKitchenModel } from "./model.js";

const SUPPORTED_LAYOUTS = new Set(["straight", "l"]);
const MODULE_HEIGHT_BASE = 720;
const MODULE_DEPTH_BASE = 560;
const MODULE_DEPTH_WALL = 320;
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
  const warnings = [];

  if (!SUPPORTED_LAYOUTS.has(brief.kitchen.layout)) {
    return { ok: false, error: `Layout "${brief.kitchen.layout}" is not yet supported. Supported: straight, l.`, model };
  }

  model.layout = brief.kitchen.layout;
  model.roomEnvelope = {
    wallAmm: brief.kitchen.room.wallAmm,
    wallBmm: brief.kitchen.room.wallBmm,
    ceilingHeightMm: brief.kitchen.room.ceilingHeightMm
  };

  const walls = buildWalls(brief);
  model.walls = walls;

  const modules = brief.kitchen.modules || [];
  let currentX = { A: 0, B: 0 };

  for (const mod of modules) {
    const wall = clean(mod.wall) || "A";
    if (!walls.find((w) => w.id === wall)) {
      warnings.push(`Module references unknown wall "${wall}", skipping.`);
      continue;
    }
    const wallLength = walls.find((w) => w.id === wall).lengthMm;
    const x = currentX[wall] || 0;

    if (x + mod.widthMm > wallLength) {
      warnings.push(`Module ${mod.type} (${mod.widthMm}mm) does not fit on wall ${wall} (remaining ${wallLength - x}mm).`);
      continue;
    }

    const block = {
      id: `${mod.zone}-${currentX[wall] || 0}`,
      wall,
      kind: mod.type,
      xMm: x,
      widthMm: mod.widthMm,
      heightMm: mod.heightMm,
      depthMm: mod.zone === "wall" ? MODULE_DEPTH_WALL : MODULE_DEPTH_BASE
    };

    if (mod.zone === "wall") {
      block.mountBottomMm = (brief.kitchen.room.ceilingHeightMm || 2700) - mod.heightMm;
      model.wallModules.push(block);
    } else {
      model.baseModules.push(block);
    }

    currentX[wall] = x + mod.widthMm;
  }

  // Build appliance blocks from brief
  const appliances = brief.kitchen.appliances || {};
  for (const [kind, enabled] of Object.entries(appliances)) {
    if (!enabled) continue;
    const defaults = APPLIANCE_DEFAULTS[kind];
    if (!defaults) {
      warnings.push(`Unknown appliance kind "${kind}".`);
      continue;
    }
    const targetWall = brief.kitchen.zones[`${kind}Wall`] || brief.kitchen.zones[`${kind}_wall`] || "A";
    if (!walls.find((w) => w.id === targetWall)) {
      warnings.push(`Appliance ${kind} references unknown wall "${targetWall}".`);
      continue;
    }

    model.applianceBlocks.push({
      id: `${kind}-${currentX[targetWall] || 0}`,
      wall: targetWall,
      kind,
      xMm: currentX[targetWall] || 0,
      widthMm: defaults.widthMm,
      heightMm: defaults.heightMm,
      depthMm: defaults.depthMm
    });
    currentX[targetWall] = (currentX[targetWall] || 0) + defaults.widthMm;
  }

  model.warnings = warnings;
  return { ok: true, error: "", model };
}

function buildWalls(brief) {
  const walls = [];
  if (brief.kitchen.room.wallAmm) walls.push({ id: "A", lengthMm: brief.kitchen.room.wallAmm });
  if (brief.kitchen.room.wallBmm) {
    walls.push({ id: "B", lengthMm: brief.kitchen.room.wallBmm });
  }
  if (brief.kitchen.room.wallCmm) {
    walls.push({ id: "C", lengthMm: brief.kitchen.room.wallCmm });
  }
  if (walls.length === 0) {
    walls.push({ id: "A", lengthMm: 0 });
  }
  return walls;
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}
