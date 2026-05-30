export const FORMULA_VERSION = 1;
export const RUNTIME_VERSION = 1;

export const DEFAULT_RULES = [
  { code: "material_standard", label: "Standard material", ruleType: "multiplier", value: 1, sortOrder: 10 },
  { code: "material_premium", label: "Premium material", ruleType: "multiplier", value: 1.25, sortOrder: 20 },
  { code: "material_lux", label: "Premium plus material", ruleType: "multiplier", value: 1.45, sortOrder: 30 },
  { code: "delivery", label: "Delivery", ruleType: "fixed_addon", value: 0, sortOrder: 40 },
  { code: "installation", label: "Installation", ruleType: "fixed_addon", value: 0, sortOrder: 50 },
  { code: "discount", label: "Discount", ruleType: "percent_discount", value: 0, sortOrder: 60 }
];

export const DEFAULT_FIELDS = [
  { fieldCode: "categoryCode", label: "Category", fieldType: "select", defaultValue: "kitchen", minValue: null, maxValue: null, sortOrder: 10 },
  { fieldCode: "units", label: "Size", fieldType: "number", defaultValue: "2", minValue: 0.1, maxValue: 100, sortOrder: 20 },
  { fieldCode: "materialRuleCode", label: "Material", fieldType: "select", defaultValue: "material_standard", minValue: null, maxValue: null, sortOrder: 30 }
];

export function estimateCalculatorPrice(category, rawUnits, options = {}) {
  const units = Math.max(Number(rawUnits) || 0, Number(category.minUnits) || 1);
  const rules = Array.isArray(options.rules) ? options.rules : [];
  const materialRule = options.materialRuleCode ? findMaterialRule(rules, options.materialRuleCode) : null;
  const multiplier = Math.max(1, normalizeMaterialMultiplier(materialRule?.value ?? options.materialMultiplier));
  const baseSubtotal = (Number(category.basePrice) || 0) + (Number(category.unitPrice) || 0) * units;
  const fixedAddons = rules
    .filter((rule) => rule.ruleType === "fixed_addon")
    .reduce((total, rule) => total + Math.max(0, Number(rule.value) || 0), 0);
  const discountPercent = rules
    .filter((rule) => rule.ruleType === "percent_discount")
    .reduce((total, rule) => total + Math.max(0, Number(rule.value) || 0), 0);
  const gross = baseSubtotal * multiplier + fixedAddons;
  const discount = gross * Math.min(discountPercent, 95) / 100;

  return Math.max(0, Math.round(gross - discount));
}

export function findMaterialRule(rules, materialRuleCode) {
  if (!materialRuleCode || !Array.isArray(rules)) {
    return null;
  }

  return rules.find((rule) => rule.code === materialRuleCode && rule.ruleType === "multiplier") || null;
}

export function getMaterialRules(rules) {
  return (Array.isArray(rules) ? rules : []).filter((rule) => rule.ruleType === "multiplier");
}

export function buildCalculatorRuntime(calculator) {
  return {
    ...calculator,
    runtimeVersion: RUNTIME_VERSION,
    formulaVersion: FORMULA_VERSION
  };
}

export function normalizeMaterialMultiplier(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 1;
}
