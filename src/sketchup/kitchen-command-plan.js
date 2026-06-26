export const KITCHEN_COMMAND_PLAN_VERSION = "kitchen-command-plan/v1";

const ALLOWED_COMMANDS = new Set(["set_units_mm", "create_room_envelope", "place_block_module", "place_block_appliance"]);
const ALLOWED_MODULE_KINDS = new Set(["sink-base", "drawers", "base-cabinet", "corner-base", "oven-base", "fridge-box", "wall-cabinet", "hood-cabinet"]);
const ALLOWED_APPLIANCE_KINDS = new Set(["sink", "hob", "oven", "fridge", "dishwasher", "hood"]);

const WALLS = new Set(["a", "b", "c"]);
const ZONES = new Set(["base", "wall"]);
const LAYOUTS = new Set(["straight", "l", "u", "galley", "island"]);

export function validateKitchenCommandPlan(plan = {}) {
  if (!plan || typeof plan !== "object") {
    return { ok: false, error: "kitchen_command_plan_required", message: "Kitchen command plan is required." };
  }
  if (plan.planVersion !== KITCHEN_COMMAND_PLAN_VERSION) {
    return { ok: false, error: "unsupported_plan_version", message: `Plan version must be ${KITCHEN_COMMAND_PLAN_VERSION}.` };
  }
  if (!Array.isArray(plan.commands) || plan.commands.length === 0) {
    return { ok: false, error: "commands_required", message: "At least one command is required." };
  }

  for (let i = 0; i < plan.commands.length; i++) {
    const cmd = plan.commands[i];
    if (!cmd || typeof cmd !== "object") {
      return { ok: false, error: "invalid_command", message: `Command ${i} is invalid.` };
    }
    if (!ALLOWED_COMMANDS.has(cmd.type)) {
      return { ok: false, error: "disallowed_command", message: `Command type "${cmd.type}" is not allowed.` };
    }
    if (cmd.type === "place_block_module") {
      if (!ALLOWED_MODULE_KINDS.has(cmd.kind)) {
        return { ok: false, error: "disallowed_module_kind", message: `Module kind "${cmd.kind}" is not allowed.` };
      }
      if (!WALLS.has(cmd.wall)) return invalidPayload(i, "wall");
      if (!ZONES.has(cmd.zone)) return invalidPayload(i, "zone");
      if (!Number.isFinite(cmd.xMm) || cmd.xMm < 0) return invalidPayload(i, "xMm");
      if (!Number.isFinite(cmd.widthMm) || cmd.widthMm <= 0) return invalidPayload(i, "widthMm");
      if (!Number.isFinite(cmd.heightMm) || cmd.heightMm <= 0) return invalidPayload(i, "heightMm");
      if (!Number.isFinite(cmd.depthMm) || cmd.depthMm <= 0) return invalidPayload(i, "depthMm");
    }
    if (cmd.type === "place_block_appliance") {
      if (!ALLOWED_APPLIANCE_KINDS.has(cmd.kind)) {
        return { ok: false, error: "disallowed_appliance_kind", message: `Appliance kind "${cmd.kind}" is not allowed.` };
      }
      if (!WALLS.has(cmd.wall)) return invalidPayload(i, "wall");
      if (!Number.isFinite(cmd.xMm) || cmd.xMm < 0) return invalidPayload(i, "xMm");
      if (!Number.isFinite(cmd.widthMm) || cmd.widthMm <= 0) return invalidPayload(i, "widthMm");
      if (!Number.isFinite(cmd.heightMm) || cmd.heightMm <= 0) return invalidPayload(i, "heightMm");
      if (!Number.isFinite(cmd.depthMm) || cmd.depthMm <= 0) return invalidPayload(i, "depthMm");
    }
    if (cmd.type === "create_room_envelope") {
      if (cmd.layout && !LAYOUTS.has(cmd.layout)) return invalidPayload(i, "layout");
      if (!cmd.wallAmm && !cmd.wallBmm && !cmd.wallCmm) {
        return { ok: false, error: "invalid_envelope", message: `Command ${i}: at least one wall length is required.` };
      }
    }
  }

  return { ok: true, error: "" };
}

function invalidPayload(index, field) {
  return { ok: false, error: "invalid_command_payload", message: `Command ${index}: field "${field}" is invalid or missing.` };
}

export function buildKitchenCommandPlan(furnitureModel = {}) {
  const plan = {
    planVersion: KITCHEN_COMMAND_PLAN_VERSION,
    commands: [],
    warnings: []
  };

  if (!furnitureModel || typeof furnitureModel !== "object") {
    return { ok: false, error: "furniture_model_required", plan };
  }

  // 1. Set units
  plan.commands.push({ type: "set_units_mm" });

  // 2. Create room envelope (if dimensions available)
  const layout = clean(furnitureModel.kitchenLayout);
  const walls = furnitureModel.kitchenWalls || [];
  if (walls.length > 0) {
    const cmd = { type: "create_room_envelope", layout };
    for (const wall of walls) {
      const id = clean(wall.id).toLowerCase();
      if (id === "a") cmd.wallAmm = wall.lengthMm;
      if (id === "b") cmd.wallBmm = wall.lengthMm;
      if (id === "c") cmd.wallCmm = wall.lengthMm;
    }
    if (furnitureModel.overall?.height) cmd.ceilingHeightMm = furnitureModel.overall.height;
    plan.commands.push(cmd);
  } else {
    plan.warnings.push("No walls defined; room envelope not created.");
  plan.missingInfo = ["wall dimensions"];
  }

  // 3. Place base modules
  for (const mod of furnitureModel.kitchenBaseModules || []) {
    plan.commands.push({
      type: "place_block_module",
      zone: "base",
      wall: mod.wall,
      kind: mod.kind,
      xMm: mod.xMm,
      widthMm: mod.widthMm,
      heightMm: mod.heightMm,
      depthMm: mod.depthMm
    });
  }

  // 4. Place wall modules
  for (const mod of furnitureModel.kitchenWallModules || []) {
    plan.commands.push({
      type: "place_block_module",
      zone: "wall",
      wall: mod.wall,
      kind: mod.kind,
      xMm: mod.xMm,
      widthMm: mod.widthMm,
      heightMm: mod.heightMm,
      depthMm: mod.depthMm,
      mountBottomMm: mod.mountBottomMm || null
    });
  }

  // 5. Place appliances
  for (const app of furnitureModel.kitchenAppliances || []) {
    plan.commands.push({
      type: "place_block_appliance",
      wall: app.wall,
      kind: app.kind,
      xMm: app.xMm,
      widthMm: app.widthMm,
      heightMm: app.heightMm,
      depthMm: app.depthMm
    });
  }

  const validation = validateKitchenCommandPlan(plan);
  if (!validation.ok) {
    return { ok: false, error: validation.message, plan };
  }

  return { ok: true, error: "", plan };
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}
