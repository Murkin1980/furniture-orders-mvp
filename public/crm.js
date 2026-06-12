import { CRM_STATUSES, calculateCrmSummary, filterCrmOrders, getCrmOrderViewModel, groupCrmOrders } from "./crm-core.js";

const statusLabels = {
  new: "Новые", in_review: "На проверке", quoted: "Смета отправлена",
  in_production: "В производстве", completed: "Завершены", canceled: "Отменены"
};
const state = { orders: [], query: "" };
const tokenInput = document.querySelector("#token");
const searchInput = document.querySelector("#search");
const board = document.querySelector("#crm-board");
const summary = document.querySelector("#crm-summary");
const message = document.querySelector("#message");
const refreshButton = document.querySelector("#refresh");

tokenInput.value = localStorage.getItem("furnitureAdminToken") || "";
document.querySelector("#save-token").addEventListener("click", () => {
  localStorage.setItem("furnitureAdminToken", tokenInput.value.trim());
  loadOrders();
});
refreshButton.addEventListener("click", loadOrders);
searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  render();
});
loadOrders();

async function loadOrders() {
  if (!getToken()) {
    setMessage("Введите admin token, чтобы загрузить воронку.", "bad");
    renderEmpty();
    return;
  }
  refreshButton.disabled = true;
  setMessage("Загружаем заявки...");
  try {
    const json = await adminFetchJson("/api/orders");
    state.orders = json.items || [];
    render();
    setMessage(`Заявок в CRM: ${state.orders.length}`, "ok");
  } catch (error) {
    setMessage(error.message, "bad");
    renderEmpty();
  } finally {
    refreshButton.disabled = false;
  }
}

function render() {
  const orders = filterCrmOrders(state.orders, state.query);
  const data = calculateCrmSummary(orders);
  summary.innerHTML = [
    ["Всего заявок", data.total],
    ["Активные", data.active],
    ["Активный бюджет", formatMoney(data.activeBudget)],
    ["Завершено", data.completed]
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  renderBoard(groupCrmOrders(orders));
}

function renderBoard(groups) {
  board.innerHTML = CRM_STATUSES.map((status) => `
    <section class="lane" data-status="${status}">
      <header class="lane-head"><h2>${statusLabels[status]}</h2><span>${groups[status].length}</span></header>
      <div class="lane-list">${groups[status].length ? groups[status].map(renderCard).join("") : `<p class="empty">Нет заявок</p>`}</div>
    </section>
  `).join("");
  for (const select of board.querySelectorAll("[data-order-status]")) select.addEventListener("change", updateStatus);
}

function renderCard(order) {
  const item = getCrmOrderViewModel(order);
  const details = [item.furnitureType, item.city].filter(Boolean).join(" · ");
  const ai = item.aiScore !== null ? `<span class="signal ai">AI ${escapeHtml(item.aiScore)} · ${escapeHtml(item.aiTemperature || "neutral")}</span>` : "";
  const crm = item.crmStatus ? `<span class="signal sync">Twenty: ${escapeHtml(item.crmStatus)}</span>` : "";
  return `
    <article class="lead-card">
      <div class="lead-top"><span class="lead-id">#${escapeHtml(item.id)}</span><strong>${escapeHtml(item.clientName)}</strong><span class="money">${formatMoney(item.budget)}</span></div>
      <a class="phone" href="tel:${escapeHtml(item.phone)}">${escapeHtml(item.phone || "Телефон не указан")}</a>
      <p class="details">${escapeHtml(details || "Тип и город не указаны")}</p>
      ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
      ${item.notes ? `<p class="note">${escapeHtml(item.notes)}</p>` : ""}
      ${item.aiSummary ? `<p class="ai-summary">${escapeHtml(item.aiSummary)}</p>` : ""}
      <div class="signals">${ai}${crm}</div>
      <label>Этап<select data-order-status="${escapeHtml(item.id)}" data-previous-status="${escapeHtml(item.status)}">
        ${CRM_STATUSES.map((status) => `<option value="${status}" ${status === item.status ? "selected" : ""}>${statusLabels[status]}</option>`).join("")}
      </select></label>
      <time>${escapeHtml(item.updatedAt)}</time>
    </article>`;
}

async function updateStatus(event) {
  const select = event.currentTarget;
  const orderId = Number(select.dataset.orderStatus);
  const order = state.orders.find((item) => Number(item.id) === orderId);
  select.disabled = true;
  try {
    await adminFetchJson("/api/orders/status", { method: "POST", payload: { orderId, status: select.value, notes: order?.notes || "" } });
    order.status = select.value;
    setMessage(`Заказ #${orderId} перемещён: ${statusLabels[select.value]}.`, "ok");
    render();
  } catch (error) {
    select.value = select.dataset.previousStatus;
    setMessage(error.message, "bad");
  } finally {
    select.disabled = false;
  }
}

async function adminFetchJson(path, { method = "GET", payload } = {}) {
  const headers = { "X-Admin-Token": getToken() };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { method, headers, body: payload !== undefined ? JSON.stringify(payload) : undefined });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "CRM request failed.");
  return json;
}

function renderEmpty() {
  summary.innerHTML = "";
  board.innerHTML = `<div class="board-empty">Воронка пока недоступна.</div>`;
}
function setMessage(text, kind = "") {
  message.textContent = text;
  message.className = `status-line ${kind}`.trim();
}
function getToken() { return tokenInput.value.trim(); }
function formatMoney(value) { return value ? `${new Intl.NumberFormat("ru-KZ").format(value)} ₸` : "Бюджет не указан"; }
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
