const ACTIVE_STATUSES = new Set(["new", "in_review", "quoted", "in_production"]);

export function filterAdminOrders(orders = [], query = "", status = "") {
  const needle = clean(query).toLowerCase();
  return orders.filter((order) => {
    if (status && clean(order?.status) !== status) return false;
    if (!needle) return true;
    return [order?.id, order?.clientName, order?.phone, order?.city, order?.furnitureType, order?.aiFurnitureType, order?.description, order?.notes]
      .some((value) => clean(value).toLowerCase().includes(needle));
  });
}

export function calculateAdminSummary(orders = []) {
  return orders.reduce((summary, order) => {
    const status = clean(order?.status);
    const budget = safeNumber(order?.budget);
    summary.total += 1;
    if (status === "new") summary.newOrders += 1;
    if (ACTIVE_STATUSES.has(status)) {
      summary.active += 1;
      summary.activeBudget += budget;
    }
    if (status === "completed") summary.completed += 1;
    if (status === "new" || clean(order?.aiTemperature).toLowerCase() === "hot" || safeNumber(order?.aiScore) >= 70) summary.attention += 1;
    return summary;
  }, { total: 0, newOrders: 0, active: 0, completed: 0, attention: 0, activeBudget: 0 });
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
