import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCommercialProposal,
  renderCommercialProposalHtml
} from "../src/proposals/commercial-proposal-template.js";

const sample = {
  proposalNumber: "КП-014",
  date: "21.06.2026",
  company: { name: "Salamat Mebel", phone: "+7 700 000 00 00" },
  customer: { name: "Тестовый заказчик" },
  items: [
    { name: "Ресепшен", specification: "ЛДСП, кромка ПВХ", unit: "шт", quantity: 2, unitPrice: 150000 },
    { name: "Шкаф", quantity: 1, unit_price: 220000 }
  ],
  terms: { production_days: 18, installationDays: 4, warrantyMonths: 12 },
  directorName: "И.И. Иванов"
};

test("normalizes proposal and calculates line totals", () => {
  const result = normalizeCommercialProposal(sample);
  assert.equal(result.items[0].total, 300000);
  assert.equal(result.items[1].total, 220000);
  assert.equal(result.total, 520000);
  assert.equal(result.terms.productionDays, 18);
});

test("supports an explicit final total", () => {
  const result = normalizeCommercialProposal({ ...sample, total: 500000 });
  assert.equal(result.subtotal, 520000);
  assert.equal(result.total, 500000);
});

test("renders Tuba-style A4 structure and proposal data", () => {
  const html = renderCommercialProposalHtml(sample);
  assert.match(html, /@page \{ size: A4/);
  assert.match(html, /КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № КП-014/);
  assert.match(html, /Тех\. спецификация/);
  assert.match(html, /520(?:\s|&nbsp;| )000/);
  assert.match(html, /Гарантийные обязательства: 12 календарных месяцев/);
});

test("escapes customer and item content", () => {
  const html = renderCommercialProposalHtml({
    customer: { name: '<script>alert("x")</script>' },
    items: [{ name: "Шкаф <опасный>", quantity: 1, unitPrice: 1 }]
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Шкаф &lt;опасный&gt;/);
});

test("rejects unsafe logo URL and renders a placeholder", () => {
  const html = renderCommercialProposalHtml({ company: { logoUrl: "javascript:alert(1)" } });
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /logo-placeholder/);
});

test("handles empty input without throwing", () => {
  const result = normalizeCommercialProposal();
  const html = renderCommercialProposalHtml();
  assert.deepEqual(result.items, []);
  assert.match(html, /Добавьте позиции коммерческого предложения/);
  assert.doesNotMatch(html, /undefined|null/);
});

