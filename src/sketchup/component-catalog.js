export const SKETCHUP_COMPONENT_CATALOG_VERSION = "sketchup-component-catalog/v1";
export const SKETCHUP_COMPONENT_PLACEMENT_VERSION = "sketchup-component-placement/v1";

export const COMPONENT_FAMILIES = Object.freeze([
  "cabinet",
  "door",
  "drawer",
  "shelf",
  "panel",
  "countertop",
  "hardware",
  "appliance",
  "filler",
  "other"
]);

export const COMPONENT_SOURCES = Object.freeze([
  "in_house",
  "easykitchen",
  "external_reference"
]);

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,95}$/;
const SAFE_ADAPTER_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,159}$/;

export function normalizeComponentCatalog(input = {}) {
  const rawComponents = Array.isArray(input.components) ? input.components : [];
  const components = [];
  const seen = new Set();
  const warnings = [];

  for (const raw of rawComponents) {
    const component = normalizeComponentDefinition(raw, warnings);
    if (!component) continue;
    if (seen.has(component.componentId)) {
      warnings.push(`Duplicate component "${component.componentId}" was ignored.`);
      continue;
    }
    seen.add(component.componentId);
    components.push(component);
  }

  return {
    catalogVersion: SKETCHUP_COMPONENT_CATALOG_VERSION,
    components,
    warnings
  };
}

export function normalizeComponentDefinition(input = {}, warnings = []) {
  if (!isPlainObject(input)) return null;
  const componentId = clean(input.componentId ?? input.id);
  const label = clean(input.label ?? input.name);
  if (!SAFE_ID.test(componentId) || !label) {
    warnings.push("Component definition was ignored because it has an unsafe id or empty label.");
    return null;
  }
  const family = normalizeEnum(input.family, COMPONENT_FAMILIES, "other");
  const source = normalizeEnum(input.source, COMPONENT_SOURCES, "in_house");
  const adapterKey = clean(input.adapterKey ?? input.adapter_key);
  if (adapterKey && !SAFE_ADAPTER_KEY.test(adapterKey)) {
    warnings.push(`Component "${componentId}" adapterKey was ignored because it is unsafe.`);
  }

  return stripUndefined({
    componentId,
    label,
    family,
    source,
    adapterKey: adapterKey && SAFE_ADAPTER_KEY.test(adapterKey) ? adapterKey : "",
    aliases: normalizeAliases(input.aliases, label),
    defaults: normalizeDefaults(input.defaults),
    notes: normalizeStringArray(input.notes)
  });
}

export function buildComponentPlacementPlan(model = {}, catalogInput = {}) {
  const catalog = catalogInput.catalogVersion === SKETCHUP_COMPONENT_CATALOG_VERSION
    ? catalogInput
    : normalizeComponentCatalog(catalogInput);
  const sourceComponents = Array.isArray(model.components) ? model.components : [];
  const placements = [];
  const warnings = [...(Array.isArray(catalog.warnings) ? catalog.warnings : [])];

  for (const sourceComponent of sourceComponents) {
    const label = clean(isPlainObject(sourceComponent) ? sourceComponent.label : sourceComponent);
    if (!label) continue;
    const matched = findComponent(label, catalog.components);
    if (!matched) {
      warnings.push(`No catalog component matched "${label}".`);
      continue;
    }
    placements.push({
      sourceLabel: label,
      componentId: matched.componentId,
      family: matched.family,
      source: matched.source,
      adapterKey: matched.adapterKey,
      parameters: { ...matched.defaults },
      placement: "metadata_only"
    });
  }

  return {
    placementVersion: SKETCHUP_COMPONENT_PLACEMENT_VERSION,
    sourceModelVersion: clean(model.modelVersion),
    source: {
      orderId: positiveInteger(model.source?.orderId),
      recognitionId: positiveInteger(model.source?.recognitionId)
    },
    placements,
    warnings,
    readyForSketchUpAdapter: placements.length > 0 && !warnings.some((warning) => warning.startsWith("No catalog component matched"))
  };
}

function findComponent(label, components) {
  const target = normalizeAlias(label);
  return (Array.isArray(components) ? components : []).find((component) => {
    const aliases = Array.isArray(component.aliases) ? component.aliases : [];
    return aliases.map(normalizeAlias).includes(target);
  }) || null;
}

function normalizeAliases(input, label) {
  return [...new Set([label, ...normalizeStringArray(input)].map(clean).filter(Boolean))];
}

function normalizeDefaults(input) {
  if (!isPlainObject(input)) return {};
  const defaults = {};
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = clean(key);
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(normalizedKey)) continue;
    if (typeof value === "string") defaults[normalizedKey] = clean(value);
    if (typeof value === "number" && Number.isFinite(value)) defaults[normalizedKey] = value;
    if (typeof value === "boolean") defaults[normalizedKey] = value;
  }
  return defaults;
}

function normalizeStringArray(value) {
  return (Array.isArray(value) ? value : []).map(clean).filter(Boolean);
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = clean(value).toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeAlias(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
