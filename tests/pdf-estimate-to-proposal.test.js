import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapPdfEstimateToProposalLines } from "../src/pdf/pdf-estimate-to-proposal.js";

describe("mapPdfEstimateToProposalLines", () => {
  it("returns empty for missing estimate", () => {
    assert.deepEqual(mapPdfEstimateToProposalLines(null), { items: [], total: 0 });
  });

  it("maps estimate items to proposal lines", () => {
    const estimate = {
      items: [
        { label: "Кухня", units: 3, unitPrice: 120000 },
        { label: "Шкаф", units: 2, unitPrice: 80000 }
      ]
    };
    const result = mapPdfEstimateToProposalLines(estimate);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].label, "Кухня");
    assert.equal(result.items[0].quantity, 3);
    assert.equal(result.items[0].total, 360000);
    assert.equal(result.total, 360000 + 160000);
  });

  it("handles empty items", () => {
    const result = mapPdfEstimateToProposalLines({ items: [] });
    assert.equal(result.items.length, 0);
    assert.equal(result.total, 0);
  });

  it("does not mutate input", () => {
    const estimate = { items: [{ label: "Кухня", units: 1, unitPrice: 1000 }] };
    const frozen = Object.freeze(JSON.parse(JSON.stringify(estimate)));
    mapPdfEstimateToProposalLines(frozen);
  });
});
