export const KITCHEN_BRIEF_VERSION = 1;

export const LAYOUT_TYPES = Object.freeze(["straight", "l", "u", "galley", "island"]);
export const MODULE_TYPES = Object.freeze(["sink-base", "drawers", "base-cabinet", "corner-base", "oven-base", "fridge-box", "wall-cabinet", "hood-cabinet"]);
export const SOURCE_TYPES = Object.freeze(["order", "calculator", "pdf"]);
export const FRONT_MATERIALS = Object.freeze(["MDF", "LDSP", "massive", "acrylic", "glass", "metal"]);
export const FRONT_FINISHES = Object.freeze(["matte", "gloss", "satin", "natural"]);

export function getDefaultKitchenBrief() {
  return {
    schemaVersion: KITCHEN_BRIEF_VERSION,
    sourceType: "order",
    sourceRef: { orderId: null, calculatorId: null, pdfDraftId: null },
    customer: { name: "", phone: "", city: "" },
    kitchen: {
      layout: "",
      room: { wallAmm: null, wallBmm: null, wallCmm: null, ceilingHeightMm: null },
      style: { frontMaterial: "MDF", frontFinish: "matte", frontColor: "white", bodyMaterial: "LDSP", bodyColor: "sonoma" },
      appliances: {},
      zones: {},
      modules: []
    },
    commercial: { budgetKzt: null, estimateKzt: null, calculatorMeta: null },
    notes: []
  };
}

export function normalizeKitchenBrief(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid_input", brief: getDefaultKitchenBrief() };
  }

  const sourceType = normalizeEnum(input.sourceType, SOURCE_TYPES, "order");
  const sourceRef = normalizeSourceRef(input.sourceRef, sourceType);
  const customer = normalizeCustomer(input.customer);
  const kitchen = normalizeKitchen(input.kitchen);
  const commercial = normalizeCommercial(input.commercial);
  const notes = normalizeStringArray(input.notes);

  const errors = [];
  if (!kitchen.layout) errors.push("Kitchen layout is required (straight, L, U, galley, island).");
  if (kitchen.room.wallAmm === null && kitchen.room.wallBmm === null) {
    errors.push("At least one wall length is required.");
  }
  if (kitchen.room.ceilingHeightMm === null) {
    errors.push("Ceiling height is required.");
  }

  return {
    ok: errors.length === 0,
    error: errors.length ? errors.join("; ") : "",
    brief: {
      schemaVersion: KITCHEN_BRIEF_VERSION,
      sourceType,
      sourceRef,
      customer,
      kitchen,
      commercial,
      notes
    }
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
  return {
    name: clean(input.name),
    phone: clean(input.phone),
    city: clean(input.city)
  };
}

function normalizeKitchen(input) {
  if (!input || typeof input !== "object") return getDefaultKitchenBrief().kitchen;
  return {
    layout: normalizeEnum(input.layout, LAYOUT_TYPES, ""),
    room: normalizeRoom(input.room),
    style: normalizeStyle(input.style),
    appliances: isPlainObject(input.appliances) ? input.appliances : {},
    zones: isPlainObject(input.zones) ? input.zones : {},
    modules: normalizeModules(input.modules)
  };
}

function normalizeRoom(input) {
  if (!input || typeof input !== "object") return getDefaultKitchenBrief().kitchen.room;
  return {
    wallAmm: normalizePositiveInt(input.wallAmm),
    wallBmm: normalizePositiveInt(input.wallBmm),
    wallCmm: normalizePositiveInt(input.wallCmm),
    ceilingHeightMm: normalizePositiveInt(input.ceilingHeightMm)
  };
}

function normalizeStyle(input) {
  if (!input || typeof input !== "object") return getDefaultKitchenBrief().kitchen.style;
  return {
    frontMaterial: normalizeEnum(input.frontMaterial, FRONT_MATERIALS, "MDF"),
    frontFinish: normalizeEnum(input.frontFinish, FRONT_FINISHES, "matte"),
    frontColor: clean(input.frontColor) || "white",
    bodyMaterial: normalizeEnum(input.bodyMaterial, FRONT_MATERIALS, "LDSP"),
    bodyColor: clean(input.bodyColor) || "sonoma"
  };
}

function normalizeModules(input) {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeModule).filter(Boolean);
}

function normalizeModule(input) {
  if (!input || typeof input !== "object") return null;
  const type = normalizeEnum(input.type, MODULE_TYPES);
  if (!type) return null;
  return {
    zone: clean(input.zone) || "base",
    wall: clean(input.wall) || "A",
    type,
    widthMm: normalizePositiveInt(input.widthMm),
    heightMm: normalizePositiveInt(input.heightMm) || 720,
    depthMm: normalizePositiveInt(input.depthMm) || (input.zone === "wall" ? 320 : 560)
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

function normalizeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function normalizePositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return [];
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
