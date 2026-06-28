import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSupplierCatalog } from "../src/supplier/supplier-schema.js";
import { validateImportSource, validateImportBatch } from "../src/supplier/import-contract.js";

describe("normalizeSupplierCatalog", () => {
  it("rejects non-object", () => {
    assert.equal(normalizeSupplierCatalog(null).ok, false);
  });

  it("requires supplier name", () => {
    const r = normalizeSupplierCatalog({ items: [{ sku: "A", name: "Item", unitPrice: 100 }] });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("Supplier name"));
  });

  it("defaults to KZT when currency is not specified", () => {
    const r = normalizeSupplierCatalog({
      supplier: { name: "Test", sourceType: "manual" },
      items: [{ sku: "S1", name: "Item", unitPrice: 100 }]
    });
    assert.equal(r.ok, true);
    assert.equal(r.catalog.priceList.currency, "KZT");
  });

  it("requires unitPrice on all items", () => {
    const r = normalizeSupplierCatalog({
      supplier: { name: "Supplier A", sourceType: "manual" },
      priceList: { currency: "KZT" },
      items: [{ sku: "S1", name: "Item 1" }, { sku: "S2", name: "Item 2", unitPrice: 500 }]
    });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("without unitPrice"));
  });

  it("normalizes a valid catalog", () => {
    const r = normalizeSupplierCatalog({
      supplier: { name: "Test Supplier", sourceType: "csv" },
      priceList: { currency: "KZT", version: 3 },
      items: [
        { sku: "MDF-WHITE-001", name: "MDF White 18mm", unitPrice: 15000, unit: "sheet", material: "MDF" },
        { sku: "LDSP-SONOMA-002", name: "LDSP Sonoma 16mm", unitPrice: 12000, unit: "sheet", material: "LDSP" }
      ]
    });
    assert.equal(r.ok, true);
    assert.equal(r.catalog.items.length, 2);
    assert.equal(r.catalog.supplier.name, "Test Supplier");
    assert.equal(r.catalog.priceList.currency, "KZT");
    assert.equal(r.catalog.priceList.version, 3);
  });
});

describe("validateImportSource", () => {
  it("rejects empty source", () => {
    assert.equal(validateImportSource({}).ok, false);
  });

  it("rejects unsupported source type", () => {
    const r = validateImportSource({ type: "ftp", url: "ftp://..." });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("unsupported_source"));
  });

  it("accepts manual source without URL", () => {
    const r = validateImportSource({ type: "manual" });
    assert.equal(r.ok, true);
  });

  it("accepts API source with URL", () => {
    const r = validateImportSource({ type: "api", url: "https://supplier.example.com/prices" });
    assert.equal(r.ok, true);
  });
});

describe("validateImportBatch", () => {
  it("rejects empty batch", () => {
    const r = validateImportBatch([]);
    assert.equal(r.ok, false);
  });

  it("rejects rows with missing prices", () => {
    const r = validateImportBatch([
      { sku: "A", name: "Item A" },
      { sku: "B", name: "Item B", unitPrice: 500 }
    ]);
    assert.equal(r.ok, false);
    assert.equal(r.failed, 1);
    assert.equal(r.passed, 1);
  });

  it("rejects invalid currency format", () => {
    const r = validateImportBatch([
      { sku: "A", name: "Item A", unitPrice: 100, currency: "kzt" }
    ]);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("currency")));
  });

  it("accepts valid batch", () => {
    const r = validateImportBatch([
      { sku: "MDF-001", name: "MDF White 18mm", unitPrice: 15000, currency: "KZT" },
      { sku: "LDSP-001", name: "LDSP Sonoma", unitPrice: 12000, currency: "KZT" }
    ]);
    assert.equal(r.ok, true);
    assert.equal(r.total, 2);
  });
});
