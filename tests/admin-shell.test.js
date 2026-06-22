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
  assert.match(adminHtml, /href="#proposal-title"/);
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
  assert.match(adminHtml, /data-admin-section="proposals"/);
  assert.match(adminHtml, /data-admin-section="portfolio"/);
  assert.match(adminHtml, /data-admin-section="infrastructure"/);
});

test("admin exposes the manual commercial proposal workflow", async () => {
  const adminJs = await readFile(new URL("../public/admin.js", import.meta.url), "utf8");
  assert.match(adminHtml, /id="proposal-form"/);
  assert.match(adminHtml, /id="proposal-preview"/);
  assert.match(adminHtml, /Бюджет заявки не подставляется в цену автоматически/);
  assert.match(adminJs, /data-proposal-order-id/);
  assert.match(adminJs, /\/api\/proposals\/preview/);
  assert.match(adminJs, /downloadProposalHtml/);
  assert.match(adminJs, /printProposal/);
  assert.match(adminHtml, /id="proposal-save"/);
  assert.match(adminHtml, /id="proposal-publish"/);
  assert.match(adminHtml, /id="proposal-approve"/);
  assert.match(adminHtml, /id="proposal-versions"/);
  assert.match(adminJs, /\/api\/proposals\?orderId=/);
  assert.match(adminJs, /\/publish/);
  assert.match(adminJs, /\/approve/);
  assert.match(adminJs, /window\.confirm/);
});

test("CRM card work uses progressive disclosure", async () => {
  const crmJs = await readFile(new URL("../public/crm.js", import.meta.url), "utf8");
  assert.match(crmJs, /class="card-workspace"/);
  assert.match(crmJs, /class="primary-actions"/);
});
