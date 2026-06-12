import test from "node:test";
import assert from "node:assert/strict";
import { calculateCrmSummary, filterCrmOrders, getCrmOrderViewModel, groupCrmOrders } from "../public/crm-core.js";

const orders = [
  { id: 1, clientName: "Алия", phone: "7701", status: "new", budget: 100000, furnitureType: "kitchen" },
  { id: 2, clientName: "Бек", phone: "7702", status: "completed", budget: 250000, furnitureType: "wardrobe" },
  { id: 3, clientName: "Сауле", city: "Алматы", status: "in_review", budget: null, aiFurnitureType: "office" }
];

test("groups orders by CRM status", () => {
  const groups = groupCrmOrders(orders);
  assert.equal(groups.new.length, 1);
  assert.equal(groups.in_review.length, 1);
  assert.equal(groups.completed.length, 1);
  assert.equal(groups.canceled.length, 0);
});

test("unknown status safely falls back to new", () => {
  assert.equal(groupCrmOrders([{ id: 1, status: "unknown" }]).new.length, 1);
});

test("filters by client, phone, city and furniture type", () => {
  assert.deepEqual(filterCrmOrders(orders, "алия").map((item) => item.id), [1]);
  assert.deepEqual(filterCrmOrders(orders, "7702").map((item) => item.id), [2]);
  assert.deepEqual(filterCrmOrders(orders, "алматы").map((item) => item.id), [3]);
  assert.deepEqual(filterCrmOrders(orders, "office").map((item) => item.id), [3]);
});

test("calculates active and completed CRM summary", () => {
  assert.deepEqual(calculateCrmSummary(orders), {
    total: 3, active: 2, completed: 1, totalBudget: 350000, activeBudget: 100000, completedBudget: 250000
  });
});

test("view model prefers AI furniture type and normalizes empty values", () => {
  const view = getCrmOrderViewModel(orders[2]);
  assert.equal(view.furnitureType, "office");
  assert.equal(view.clientName, "Сауле");
  assert.equal(view.budget, 0);
  assert.equal(view.phone, "");
});

test("helpers do not mutate input orders", () => {
  const input = structuredClone(orders);
  const before = structuredClone(input);
  filterCrmOrders(input, "алия");
  groupCrmOrders(input);
  calculateCrmSummary(input);
  getCrmOrderViewModel(input[0]);
  assert.deepEqual(input, before);
});
