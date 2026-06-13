import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminHtml = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
const crmHtml = await readFile(new URL("../public/crm.html", import.meta.url), "utf8");

test("admin and CRM expose the shared operational sidebar", () => {
  for (const html of [adminHtml, crmHtml]) {
    assert.match(html, /class="app-sidebar"/);
    assert.match(html, /Furniture OS/);
    assert.match(html, /CRM-воронка/);
    assert.match(html, /Инфраструктура/);
  }
});

test("admin sidebar links preserve the existing section anchors", () => {
  assert.match(adminHtml, /href="#orders"/);
  assert.match(adminHtml, /href="#calculator-title"/);
  assert.match(adminHtml, /href="#portfolio-title"/);
  assert.match(adminHtml, /href="#sites-title"/);
  assert.match(adminHtml, /href="#vps-title"/);
});

test("operational shell collapses its sidebar on narrow screens", () => {
  assert.match(adminHtml, /body \{ padding-left: 0; \}/);
  assert.match(crmHtml, /body\{padding-left:0\}/);
});

test("admin exposes modular workspaces and actionable dashboard", () => {
  assert.match(adminHtml, /id="admin-summary"/);
  assert.match(adminHtml, /id="order-search"/);
  assert.match(adminHtml, /data-admin-section="orders"/);
  assert.match(adminHtml, /data-admin-section="portfolio"/);
  assert.match(adminHtml, /data-admin-section="infrastructure"/);
});

test("CRM card work uses progressive disclosure", async () => {
  const crmJs = await readFile(new URL("../public/crm.js", import.meta.url), "utf8");
  assert.match(crmJs, /class="card-workspace"/);
  assert.match(crmJs, /class="primary-actions"/);
});
