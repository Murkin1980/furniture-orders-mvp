export const CRM_STATUSES = ["new", "in_review", "quoted", "in_production", "completed", "canceled"];

export function filterCrmOrders(orders = [], query = "") {
  const normalizedQuery = clean(query).toLowerCase();
  if (!normalizedQuery) return [...orders];

  return orders.filter((order) => [
    order.id, order.clientName, order.phone, order.city, order.furnitureType,
    order.aiFurnitureType, order.description, order.notes
  ].some((value) => clean(value).toLowerCase().includes(normalizedQuery)));
}

export function groupCrmOrders(orders = [], statuses = CRM_STATUSES) {
  const groups = Object.fromEntries(statuses.map((status) => [status, []]));
  for (const order of orders) {
    const status = statuses.includes(order?.status) ? order.status : statuses[0];
    groups[status].push(order);
  }
  return groups;
}

export function calculateCrmSummary(orders = []) {
  return orders.reduce((summary, order) => {
    const budget = safeNumber(order?.budget);
    summary.total += 1;
    summary.totalBudget += budget;
    if (order?.status === "completed") {
      summary.completed += 1;
      summary.completedBudget += budget;
    }
    if (!["completed", "canceled"].includes(order?.status)) {
      summary.active += 1;
      summary.activeBudget += budget;
    }
    return summary;
  }, { total: 0, active: 0, completed: 0, totalBudget: 0, activeBudget: 0, completedBudget: 0 });
}

export function getCrmOrderViewModel(order = {}) {
  return {
    id: order.id ?? "",
    clientName: clean(order.clientName) || "Без имени",
    phone: clean(order.phone),
    city: clean(order.city),
    furnitureType: clean(order.aiFurnitureType) || clean(order.furnitureType) || "other",
    budget: safeNumber(order.budget),
    description: clean(order.description),
    notes: clean(order.notes),
    status: CRM_STATUSES.includes(order.status) ? order.status : "new",
    aiScore: order.aiScore ?? null,
    aiTemperature: clean(order.aiTemperature),
    aiSummary: clean(order.aiSummary),
    crmStatus: clean(order.crmSyncStatus),
    updatedAt: clean(order.updatedAt || order.createdAt)
  };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
