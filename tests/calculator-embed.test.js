import test from "node:test";
import assert from "node:assert/strict";
import { renderWidgetScript } from "../functions/api/calculators/[id]/embed.js";

test("published embed script honors active schema and mobile controls", () => {
  const script = renderWidgetScript({
    token: "test-token",
    calculator: {
      id: 7,
      title: "Kitchen estimate",
      description: "Draft estimate",
      currency: "KZT",
      categories: [{ code: "kitchen", name: "Kitchen", basePrice: 100000, unitPrice: 50000, minUnits: 2 }],
      rules: [{ code: "material_standard", label: "Standard", ruleType: "multiplier", value: 1 }],
      fields: [
        { fieldCode: "categoryCode", binding: "categoryCode", label: "Furniture", isActive: 1, isRequired: 1 },
        { fieldCode: "units", binding: "units", label: "Meters", isActive: 1, isRequired: 1, minValue: 1, maxValue: 30 },
        { fieldCode: "materialRuleCode", binding: "materialRuleCode", label: "Material", isActive: 1 },
        { fieldCode: "name", binding: "name", label: "Your name", isActive: 1, isRequired: 1 },
        { fieldCode: "phone", binding: "phone", label: "WhatsApp", isActive: 1, isRequired: 1 },
        { fieldCode: "city", binding: "city", label: "City", isActive: 0 }
      ]
    }
  });

  assert.match(script, /fieldVisible/);
  assert.match(script, /fo-hidden/);
  assert.match(script, /@media \(max-width: 560px\)/);
  assert.match(script, /min-height: 44px/);
  assert.match(script, /test-token/);
});
