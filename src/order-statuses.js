export const ORDER_STATUSES = [
  "new",
  "in_review",
  "quoted",
  "in_production",
  "completed",
  "canceled"
];

export function isOrderStatus(value) {
  return ORDER_STATUSES.includes(value);
}
