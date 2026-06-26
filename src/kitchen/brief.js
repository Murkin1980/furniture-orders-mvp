export const KITCHEN_BRIEF_VERSION = 1;

export const LAYOUT_TYPES = Object.freeze(["straight", "l", "u", "galley", "island"]);
export const MODULE_TYPES = Object.freeze(["sink-base", "drawers", "base-cabinet", "corner-base", "oven-base", "fridge-box", "wall-cabinet", "hood-cabinet"]);
export const SOURCE_TYPES = Object.freeze(["order", "calculator", "pdf"]);
export const FRONT_MATERIALS = Object.freeze(["MDF", "LDSP", "massive", "acrylic", "glass", "metal"]);
export const BODY_MATERIALS = Object.freeze(["LDSP", "MDF", "plywood", "metal"]);
export const FRONT_FINISHES = Object.freeze(["matte", "gloss", "satin", "natural"]);
export const ALLOWED_WALLS = Object.freeze(["a", "b", "c"]);

export function getDefaultKitchenBrief() {
  return {
    schemaVersion: KITCHEN_BRIEF_VERSION,
    sourceType: "order",
    sourceRef: { orderId: null, calculatorId: null, pdfDraftId: null },
    customer: { name: "", phone: "", city: "" },
    kitchen: {
      layout: "",
      room: { wallAmm: null, wallBmm: null, wallCmm: null, ceilingHeightMm: null },
      style: { frontMaterial: null, frontFinish: null, frontColor: null, bodyMaterial: null, bodyColor: null },
      appliances: {},
      zones: {},
      modules: []
    },
    commercial: { budgetKzt: null, estimateKzt: null, calculatorMeta: null },
    notes: [],
    provenance: { inferred: false, requiresReview: true }
  };
}

export function normalizeKitchenBrief(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid_input", warnings: [], brief: getDefaultKitchenBrief() };
  }

  const warnings = [];
  const sourceType = normalizeEnum(input.sourceType, SOURCE_TYPES, "order");
  const sourceRef = normalizeSourceRef(input.sourceRef, sourceType);
  const customer = normalizeCustomer(input.customer);
  const kitchen = normalizeKitchen(input.kitchen, warnings);
  const commercial = normalizeCommercial(input.commercial);
  const notes = normalizeStringArray(input.notes);
  const provenance = normalizeProvenance(input.provenance);

  const errors = [];
  if (!kitchen.layout) errors.push("Kitchen layout is required (straight, l, u, galley, island).");
  if (kitchen.room.wallAmm === null && kitchen.room.wallBmm === null) {
    errors.push("At least one wall length is required.");
  }
  if (kitchen.room.ceilingHeightMm === null) {
    errors.push("Ceiling height is required.");
  }
  if (kitchen.layout === "l" && kitchen.room.wallBmm === null) {
    warnings.push("L-shaped layout requires wallB for proper corner modelling.");
  }
  if (kitchen.layout === "u") {
    if (kitchen.room.wallAmm === null || kitchen.room.wallBmm === null || kitchen.room.wallCmm === null) {
      errors.push("U-shaped layout requires wallA, wallB, and wallC.");
    }
  }
  if (kitchen.layout === "galley" && kitchen.room.wallBmm === null) {
    warnings.push("Galley layout typically requires two parallel walls (wallA, wallB).");
  }
  if (kitchen.layout === "island" && kitchen.room.wallAmm === null) {
    warnings.push("Island layout requires at least one wall length.");
  }

  return {
    ok: errors.length === 0,
    error: errors.length ? errors.join("; ") : "",
    warnings,
    brief: {
      schemaVersion: KITCHEN_BRIEF_VERSION,
      sourceType,
      sourceRef,
      customer,
      kitchen,
      commercial,
      notes,
      provenance
    }
  };
}

function normalizeProvenance(input) {
  if (!input || typeof input !== "object") return { inferred: false, requiresReview: true };
  return {
    inferred: input.inferred === true,
    requiresReview: input.requiresReview !== false
  };
}

function normalizeSourceRef(ref, sourceType) {
  if (!ref || typeof ref !== "object") return { orderId: null, calculatorId: null, pdfDraftId: null };
  return {
    orderId: normalizeInt(ref.orderId),
    calculatorId: sourceType === "calculator" ? normalizeInt(ref.calculatorId) : null,
    pdfDraftId: sourceType === "pdf" ? normalizeInt(ref.pdfDraftId) : null
  };
}

function normalizeCustomer(input) {
  if (!input || typeof input !== "object") return { name: "", phone: "", city: "" };
  return { name: clean(input.name), phone: clean(input.phone), city: clean(input.city) };
}

function normalizeKitchen(input, warnings) {
  if (!input || typeof input !== "object") return getDefaultKitchenBrief().kitchen;
  return {
    layout: normalizeEnum(input.layout, LAYOUT_TYPES, ""),
    room: normalizeRoom(input.room, warnings),
    style: normalizeStyle(input.style, warnings),
    appliances: isPlainObject(input.appliances) ? input.appliances : {},
    zones: isPlainObject(input.zones) ? input.zones : {},
    modules: normalizeModules(input.modules, warnings)
  };
}

function normalizeRoom(input, warnings) {
  if (!input || typeof input !== "object") return getDefaultKitchenBrief().kitchen.room;
  const wallAmm = normalizePositiveInt(input.wallAmm);
  const wallBmm = normalizePositiveInt(input.wallBmm);
  return {
    wallAmm,
    wallBmm,
    wallCmm: normalizePositiveInt(input.wallCmm),
    ceilingHeightMm: normalizePositiveInt(input.ceilingHeightMm)
  };
}

function normalizeStyle(input, warnings) {
  if (!input || typeof input !== "object") return getDefaultKitchenBrief().kitchen.style;
  return {
    frontMaterial: normalizeEnum(input.frontMaterial, FRONT_MATERIALS, null),
    frontFinish: normalizeEnum(input.frontFinish, FRONT_FINISHES, null),
    frontColor: clean(input.frontColor) || null,
    bodyMaterial: normalizeEnum(input.bodyMaterial, BODY_MATERIALS, null),
    bodyColor: clean(input.bodyColor) || null
  };
}

function normalizeModules(input, warnings) {
  if (!Array.isArray(input)) return [];
  return input.map((m) => normalizeModule(m, warnings)).filter(Boolean);
}

function normalizeModule(input, warnings) {
  if (!input || typeof input !== "object") return null;
  const type = normalizeEnum(input.type, MODULE_TYPES);
  if (!type) return null;
  const widthMm = normalizePositiveInt(input.widthMm);
  if (!widthMm) {
    warnings.push(`Module "${input.type || "unknown"}" has no width — skipping.`);
    return null;
  }
  const wall = normalizeEnum(input.wall, ALLOWED_WALLS);
  if (!wall) {
    warnings.push(`Module "${type}" references unknown wall "${input.wall}" — using A.`);
  }
  return {
    zone: clean(input.zone) || "base",
    wall: wall || "A",
    type,
    widthMm,
    heightMm: normalizePositiveInt(input.heightMm),
    depthMm: normalizePositiveInt(input.depthMm),
    _provisional: { height: !normalizePositiveInt(input.heightMm), depth: !normalizePositiveInt(input.depthMm) }
  };
}

function normalizeCommercial(input) {
  if (!input || typeof input !== "object") return { budgetKzt: null, estimateKzt: null, calculatorMeta: null };
  return {
    budgetKzt: normalizePositiveInt(input.budgetKzt),
    estimateKzt: normalizePositiveInt(input.estimateKzt),
    calculatorMeta: isPlainObject(input.calculatorMeta) ? input.calculatorMeta : null
  };
}

function normalizeEnum(value, allowed, fallback = null) {
  const normalized = clean(value).toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeInt(value) { const n = Number(value); return Number.isInteger(n) ? n : null; }
function normalizePositiveInt(value) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return [];
}

function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function isPlainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
