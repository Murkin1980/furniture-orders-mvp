import { validateSketchUpCommandPlan } from "./command-plan.js";
import {
  SKETCHUP_COMPONENT_PLACEMENT_VERSION,
  buildComponentPlacementPlan
} from "./component-catalog.js";

export const SKETCHUP_EXECUTION_PACKAGE_VERSION = "sketchup-execution-package/v1";

export function buildSketchUpExecutionPackage(commandPlan = {}, options = {}) {
  const planValidation = validateSketchUpCommandPlan(commandPlan);
  if (!planValidation.ok) {
    return failure("invalid_command_plan", `Command plan is invalid: ${planValidation.error}.`);
  }

  const componentPlacement = normalizePlacement(commandPlan, options.componentPlacement, options.componentCatalog);
  const warnings = [
    ...normalizeStringArray(commandPlan.warnings),
    ...normalizeStringArray(componentPlacement.warnings)
  ];

  return {
    ok: true,
    package: {
      packageVersion: SKETCHUP_EXECUTION_PACKAGE_VERSION,
      source: {
        orderId: commandPlan.source.orderId,
        recognitionId: commandPlan.source.recognitionId,
        planVersion: commandPlan.planVersion,
        modelVersion: commandPlan.sourceModelVersion
      },
      commandPlan: structuredClone(commandPlan),
      componentPlacement,
      warnings,
      readyForLocalAdapter: true
    }
  };
}

export function validateSketchUpExecutionPackage(value = {}) {
  if (!isPlainObject(value) || value.packageVersion !== SKETCHUP_EXECUTION_PACKAGE_VERSION) {
    return invalid("unsupported_package_version");
  }
  if (!hasOnlyKeys(value, [
    "packageVersion",
    "source",
    "commandPlan",
    "componentPlacement",
    "warnings",
    "readyForLocalAdapter"
  ])) return invalid("invalid_package_shape");
  if (!hasOnlyKeys(value.source, ["orderId", "recognitionId", "planVersion", "modelVersion"])) {
    return invalid("invalid_source_shape");
  }
  const planValidation = validateSketchUpCommandPlan(value.commandPlan);
  if (!planValidation.ok) return invalid("invalid_command_plan");
  if (value.source.orderId !== value.commandPlan.source.orderId
    || value.source.recognitionId !== value.commandPlan.source.recognitionId
    || value.source.planVersion !== value.commandPlan.planVersion
    || value.source.modelVersion !== value.commandPlan.sourceModelVersion) {
    return invalid("source_mismatch");
  }
  const placementValidation = validateComponentPlacement(value.componentPlacement, value.source);
  if (!placementValidation.ok) return placementValidation;
  if (!Array.isArray(value.warnings) || !value.warnings.every((warning) => typeof warning === "string")) {
    return invalid("invalid_warnings");
  }
  if (value.readyForLocalAdapter !== true) return invalid("not_ready");

  return { ok: true, error: "" };
}

function normalizePlacement(commandPlan, placement, catalog) {
  if (validateComponentPlacement(placement, commandPlan.source).ok) {
    return structuredClone(placement);
  }
  return buildComponentPlacementPlan({
    modelVersion: commandPlan.sourceModelVersion,
    source: commandPlan.source,
    components: commandPlan.commands.find((command) => command.type === "attach_metadata")?.components ?? []
  }, catalog ?? { components: [] });
}

function validateComponentPlacement(value, source) {
  if (!isPlainObject(value) || value.placementVersion !== SKETCHUP_COMPONENT_PLACEMENT_VERSION) {
    return invalid("invalid_component_placement");
  }
  if (!hasOnlyKeys(value, [
    "placementVersion",
    "sourceModelVersion",
    "source",
    "placements",
    "warnings",
    "readyForSketchUpAdapter"
  ])) return invalid("invalid_component_placement_shape");
  if (!hasOnlyKeys(value.source, ["orderId", "recognitionId"])) return invalid("invalid_component_source");
  if (value.source.orderId !== source.orderId || value.source.recognitionId !== source.recognitionId) {
    return invalid("component_source_mismatch");
  }
  if (!Array.isArray(value.placements) || !Array.isArray(value.warnings)) {
    return invalid("invalid_component_placement_shape");
  }
  if (value.readyForSketchUpAdapter !== true && value.readyForSketchUpAdapter !== false) {
    return invalid("invalid_component_ready_flag");
  }
  return { ok: true, error: "" };
}

function hasOnlyKeys(value, allowedKeys) {
  if (!isPlainObject(value)) return false;
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function normalizeStringArray(value) {
  return (Array.isArray(value) ? value : []).filter((item) => typeof item === "string");
}

function failure(error, message) {
  return { ok: false, error, message, package: null };
}

function invalid(error) {
  return { ok: false, error };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
