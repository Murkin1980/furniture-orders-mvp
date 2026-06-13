import assert from "node:assert/strict";
import test from "node:test";
import { calculateAdminSummary, filterAdminOrders } from "../public/admin-core.js";

const orders = [
  { id: 1, clientName: "Aida", phone: "+7701", city: "Almaty", status: "new", budget: 100, aiScore: 80 },
  { id: 2, clientName: "Bek", furnitureType: "wardrobe", status: "in_production", budget: 200 },
  { id: 3, clientName: "Dana", status: "completed", budget: 300 }
];

test("admin summary focuses on actionable order states", () => {
  assert.deepEqual(calculateAdminSummary(orders), {
    total: 3, newOrders: 1, active: 2, completed: 1, attention: 1, activeBudget: 300
  });
});

test("admin orders filter supports query and status together", () => {
  assert.deepEqual(filterAdminOrders(orders, "wardrobe", "in_production").map((item) => item.id), [2]);
  assert.deepEqual(filterAdminOrders(orders, "almaty").map((item) => item.id), [1]);
});
