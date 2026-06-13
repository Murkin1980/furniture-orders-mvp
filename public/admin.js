    const statuses = ["new", "in_review", "quoted", "in_production", "completed", "canceled"];
    import { getOrderAiViewModel, getOrderCrmViewModel } from "./admin-orders.js";
    import { calculateAdminSummary, filterAdminOrders } from "./admin-core.js";

    const stepStatuses = ["pending", "done", "skipped"];
    const tokenInput = document.querySelector("#token");
    const filterInput = document.querySelector("#status-filter");
    const message = document.querySelector("#message");
    const tbody = document.querySelector("#orders-body");
    const adminSummary = document.querySelector("#admin-summary");
    const orderSearch = document.querySelector("#order-search");
    const refreshButton = document.querySelector("#refresh");
    const projectTitle = document.querySelector("#project-title");
    const projectProgress = document.querySelector("#project-progress");
    const projectSteps = document.querySelector("#project-steps");
    const createCalculatorButton = document.querySelector("#create-calculator");
    const calculatorList = document.querySelector("#calculator-list");
    const embedCode = document.querySelector("#embed-code");
    const calculatorPreview = document.querySelector("#calculator-preview");
    const pricingEditor = document.querySelector("#pricing-editor");
    const portfolioForm = document.querySelector("#portfolio-form");
    const portfolioList = document.querySelector("#portfolio-list");
    const portfolioFilters = document.querySelector("#portfolio-filters");
    const portfolioCategorySelect = document.querySelector("#portfolio-category-select");
    const refreshPortfolioButton = document.querySelector("#refresh-portfolio");
    const siteForm = document.querySelector("#site-form");
    const siteList = document.querySelector("#site-list");
    const siteOutput = document.querySelector("#site-output");
    const sitePreview = document.querySelector("#site-preview");
    const siteResetButton = document.querySelector("#site-reset");
    const refreshSitesButton = document.querySelector("#refresh-sites");
    const vpsDeployForm = document.querySelector("#vps-deploy-form");
    const vpsOutput = document.querySelector("#vps-output");
    const vpsHealthButton = document.querySelector("#vps-health");
    const vpsServicesButton = document.querySelector("#vps-services");
    const vpsReloadButton = document.querySelector("#vps-reload");
    const vpsLogsButton = document.querySelector("#vps-logs");
    let activeOrderId = null;
    let activeCalculator = null;
    let activePricing = null;
    let activeSite = null;
    let adminOrders = [];

    tokenInput.value = localStorage.getItem("furnitureAdminToken") || "";

    document.querySelector("#save-token").addEventListener("click", () => {
      localStorage.setItem("furnitureAdminToken", tokenInput.value.trim());
      setMessage("Токен сохранён.", "ok");
      loadOrders();
      loadCalculators();
    });

    refreshButton.addEventListener("click", loadOrders);
    filterInput.addEventListener("change", renderAdminOrders);
    orderSearch.addEventListener("input", renderAdminOrders);
    for (const link of document.querySelectorAll("[data-admin-view]")) {
      link.addEventListener("click", () => showAdminView(link.dataset.adminView));
    }
    createCalculatorButton.addEventListener("click", createDefaultCalculator);
    refreshPortfolioButton.addEventListener("click", () => loadPortfolio(""));
    portfolioForm.addEventListener("submit", createPortfolioItem);
    refreshSitesButton.addEventListener("click", loadSites);
    siteForm.addEventListener("submit", createSite);
    siteResetButton.addEventListener("click", resetSiteForm);
    vpsHealthButton.addEventListener("click", loadVpsHealth);
    vpsServicesButton.addEventListener("click", loadVpsServices);
    vpsReloadButton.addEventListener("click", reloadVpsWebserver);
    vpsLogsButton.addEventListener("click", loadVpsLogs);
    vpsDeployForm.addEventListener("submit", deployVpsSite);

    loadOrders();
    loadCalculators();
    loadPortfolio("");
    loadSites();
    showAdminView(viewFromHash());

    // Orders & project steps
    async function loadOrders() {
      const token = getToken();
      if (!token) {
        renderEmpty("Введите admin token.");
        return;
      }

      refreshButton.disabled = true;
      setMessage("Загрузка заказов...");

      try {
        const json = await adminFetchJson("/api/orders", {
          fallbackMessage: "Не удалось загрузить заказы."
        });

        adminOrders = json.items || [];
        renderAdminOrders();
        setMessage(`Заказов: ${adminOrders.length}`, "ok");
      } catch (error) {
        renderEmpty(error.message);
        setMessage(error.message, "bad");
      } finally {
        refreshButton.disabled = false;
      }
    }

    function renderAdminOrders() {
      const items = filterAdminOrders(adminOrders, orderSearch.value, filterInput.value);
      const data = calculateAdminSummary(adminOrders);
      adminSummary.innerHTML = [
        ["Все заказы", data.total, "Полная база"],
        ["Новые", data.newOrders, "Нужен первый контакт"],
        ["Активные", data.active, formatMoney(data.activeBudget)],
        ["Требуют внимания", data.attention, "Новые или горячие"],
        ["Завершены", data.completed, "Закрытые проекты"]
      ].map(([label, value, note]) => `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");
      renderOrders(items);
    }

    function renderOrders(items) {
      if (!items.length) {
        renderEmpty("Заказов нет.");
        return;
      }

      tbody.innerHTML = items.map((item) => `
        <tr>
          <td data-label="ID">#${escapeHtml(item.id)}</td>
          <td data-label="Клиент">${escapeHtml(item.clientName || "")}</td>
          <td data-label="Телефон">${escapeHtml(item.phone || "")}</td>
          <td data-label="Тип">${escapeHtml(item.furnitureType || "")}</td>
          <td data-label="Город">${escapeHtml(item.city || "")}</td>
          <td data-label="Бюджет" class="money">${formatMoney(item.budget)}</td>
          <td data-label="Статус"><span class="status-pill" data-status="${escapeHtml(item.status || "")}">${escapeHtml(item.status || "")}</span></td>
          <td data-label="Создан">${escapeHtml(item.createdAt || "")}</td>
          <td data-label="Обновлён">${escapeHtml(item.updatedAt || "")}</td>
          <td data-label="Заметка">${escapeHtml(item.notes || "")}</td>
          <td data-label="AI">${renderOrderAi(item)}</td>
          <td data-label="Действия" class="actions">
            <form data-order-id="${escapeHtml(item.id)}">
              <select name="status">
                ${statuses.map((status) => `<option value="${status}" ${status === item.status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
              <textarea name="notes" placeholder="Заметка менеджера">${escapeHtml(item.notes || "")}</textarea>
              <button type="submit">Обновить</button>
              <button class="secondary" type="button" data-project-id="${escapeHtml(item.id)}">Открыть проект</button>
              <button class="secondary" type="button" data-ai-order-id="${escapeHtml(item.id)}">${escapeHtml(getOrderAiViewModel(item).buttonLabel)}</button>
              <button class="secondary" type="button" data-crm-order-id="${escapeHtml(item.id)}">${escapeHtml(getOrderCrmViewModel(item).buttonLabel)}</button>
              ${renderOrderCrm(item)}
            </form>
          </td>
        </tr>
      `).join("");

      for (const form of tbody.querySelectorAll("form")) {
        form.addEventListener("submit", updateOrder);
      }
      for (const button of tbody.querySelectorAll("[data-project-id]")) {
        button.addEventListener("click", () => openProject(Number(button.dataset.projectId)));
      }
      for (const button of tbody.querySelectorAll("[data-ai-order-id]")) {
        button.addEventListener("click", () => analyzeOrderWithAi(Number(button.dataset.aiOrderId), button));
      }
      for (const button of tbody.querySelectorAll("[data-crm-order-id]")) {
        button.addEventListener("click", () => syncOrderToCrm(Number(button.dataset.crmOrderId), button));
      }
    }

    function renderOrderAi(item) {
      const ai = getOrderAiViewModel(item);
      if (!ai.hasAnalysis) {
        return '<span class="muted">Не запускался</span>';
      }

      return `
        <div class="order-ai ${ai.error ? "bad" : ""}">
          <strong>${escapeHtml(ai.status || "unknown")} · ${escapeHtml(ai.score ?? "")}</strong>
          <span>${escapeHtml(ai.temperature)} · ${escapeHtml(ai.furnitureType)} · ${ai.qualified ? "qualified" : "not qualified"}</span>
          <span>${escapeHtml(ai.summary)}</span>
          <span>${escapeHtml(ai.nextQuestion)}</span>
          <span>Missing: ${escapeHtml(ai.missingInfo.join(", ") || "—")}</span>
          <span>${escapeHtml(ai.urgency)} · ${escapeHtml(ai.potentialValue)} · ${escapeHtml(ai.recommendedStatus)}</span>
          ${ai.error ? `<span class="ai-error">${escapeHtml(ai.error)}</span>` : ""}
        </div>
      `;
    }

    async function analyzeOrderWithAi(orderId, button) {
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "AI-анализ...";
      setMessage(`Запуск AI-анализа заказа #${orderId}...`);

      try {
        const json = await adminFetchJson(`/api/orders/${orderId}/ai/analyze`, {
          method: "POST",
          fallbackMessage: "AI-анализ не выполнен."
        });

        setMessage(`AI-анализ заказа #${json.orderId} завершён.`, json.update?.ai_status === "failed" ? "bad" : "ok");
        await loadOrders();
      } catch (error) {
        setMessage(error.message, "bad");
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }

    function renderOrderCrm(item) {
      const crm = getOrderCrmViewModel(item);
      if (!crm.hasSync) return '<span class="muted">CRM: не отправлялся</span>';
      return `
        <div class="order-ai ${crm.error ? "bad" : ""}">
          <strong>CRM: ${escapeHtml(crm.status)}</strong>
          <span>Person: ${escapeHtml(crm.personId || "—")}</span>
          <span>Opportunity: ${escapeHtml(crm.opportunityId || "—")}</span>
          <span>Note: ${escapeHtml(crm.noteId || "—")}</span>
          <span>${escapeHtml(crm.syncedAt || crm.lastAttemptAt)}</span>
          ${crm.error ? `<span class="ai-error">${escapeHtml(crm.error)}</span>` : ""}
        </div>`;
    }

    async function syncOrderToCrm(orderId, button) {
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Отправка в CRM...";
      setMessage(`Отправка заказа #${orderId} в CRM...`);
      try {
        const json = await adminFetchJson(`/api/orders/${orderId}/crm/twenty`, {
          method: "POST",
          fallbackMessage: "Заказ не отправлен в CRM."
        });
        setMessage(`CRM sync заказа #${json.orderId}: ${json.sync?.status}.`, json.sync?.status === "success" ? "ok" : "bad");
        await loadOrders();
      } catch (error) {
        setMessage(error.message, "bad");
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }

    function showAdminView(view) {
      const safeView = document.querySelector(`[data-admin-section="${view}"]`) ? view : "orders";
      for (const section of document.querySelectorAll("[data-admin-section]")) {
        section.classList.toggle("is-active", section.dataset.adminSection === safeView);
      }
      for (const link of document.querySelectorAll("[data-admin-view]")) {
        link.classList.toggle("active", link.dataset.adminView === safeView);
      }
    }

    function viewFromHash() {
      return ({
        "#project-title": "project",
        "#calculator-title": "calculators",
        "#portfolio-title": "portfolio",
        "#sites-title": "sites",
        "#vps-title": "infrastructure"
      })[window.location.hash] || "orders";
    }

    async function updateOrder(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button");
      const token = getToken();

      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      button.disabled = true;

      try {
        const json = await adminFetchJson("/api/orders/status", {
          method: "POST",
          payload: {
            orderId: Number(form.dataset.orderId),
            status: form.elements.status.value,
            notes: form.elements.notes.value
          },
          fallbackMessage: "Статус не обновлён."
        });

        setMessage(`Заказ #${json.item.id} обновлён.`, "ok");
        if (json.projectSteps?.length) {
          activeOrderId = json.item.id;
          renderSteps(activeOrderId, json.projectSteps);
        }
        await loadOrders();
      } catch (error) {
        setMessage(error.message, "bad");
      } finally {
        button.disabled = false;
      }
    }

    async function openProject(orderId) {
      showAdminView("project");
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      activeOrderId = orderId;
      projectTitle.textContent = `Шаги заказа #${orderId}`;
      projectProgress.textContent = "";
      projectSteps.innerHTML = '<div class="muted">Загрузка шагов...</div>';

      try {
        let json = await adminFetchJson(`/api/order-steps?orderId=${orderId}`, {
          fallbackMessage: "Не удалось загрузить шаги."
        });

        if (!json.items.length) {
          json = await adminFetchJson("/api/orders/project/init", {
            method: "POST",
            payload: { orderId },
            fallbackMessage: "Не удалось создать шаги."
          });
        }

        renderSteps(orderId, json.items || []);
      } catch (error) {
        projectSteps.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
        setMessage(error.message, "bad");
      }
    }

    function renderSteps(orderId, items) {
      const doneCount = items.filter((item) => item.status === "done").length;
      projectTitle.textContent = `Шаги заказа #${orderId}`;
      projectProgress.textContent = `${doneCount}/${items.length} выполнено`;

      if (!items.length) {
        projectSteps.innerHTML = '<div class="muted">Шаги ещё не созданы.</div>';
        return;
      }

      projectSteps.innerHTML = items.map((item) => `
        <form class="step" data-step-id="${escapeHtml(item.id)}" data-order-id="${escapeHtml(orderId)}">
          <div>
            <div class="step-title">${escapeHtml(item.title)}</div>
            <span class="step-code">${escapeHtml(item.stepCode)}</span>
          </div>
          <select name="status">
            ${stepStatuses.map((status) => `<option value="${status}" ${status === item.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
          <textarea name="notes" placeholder="Заметка по шагу">${escapeHtml(item.notes || "")}</textarea>
          <button type="submit">Сохранить</button>
        </form>
      `).join("");

      for (const form of projectSteps.querySelectorAll("form")) {
        form.addEventListener("submit", updateStep);
      }
    }

    async function updateStep(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button");

      button.disabled = true;

      try {
        const json = await adminFetchJson("/api/order-steps/update", {
          method: "POST",
          payload: {
            orderId: Number(form.dataset.orderId),
            stepId: Number(form.dataset.stepId),
            status: form.elements.status.value,
            notes: form.elements.notes.value,
            completedBy: "manager"
          },
          fallbackMessage: "Шаг не обновлён."
        });

        setMessage(`Шаг "${json.item.title}" обновлён.`, "ok");
        await openProject(Number(form.dataset.orderId));
      } catch (error) {
        setMessage(error.message, "bad");
      } finally {
        button.disabled = false;
      }
    }

    // Calculators & pricing
    async function loadCalculators() {
      const token = getToken();
      if (!token) {
        renderCalculators([]);
        return;
      }

      try {
        const json = await adminFetchJson("/api/calculators", {
          fallbackMessage: "Calculators were not loaded."
        });

        renderCalculators(json.items || []);
      } catch (error) {
        calculatorList.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
      }
    }

    async function createDefaultCalculator() {
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      createCalculatorButton.disabled = true;

      try {
        const json = await adminFetchJson("/api/calculators", {
          method: "POST",
          payload: {
            ownerName: "Salamat Mebel",
            ownerPhone: "+77000000000",
            title: "Furniture cost calculator",
            description: "Quick estimate for custom furniture orders.",
            currency: "KZT"
          },
          fallbackMessage: "Calculator was not created."
        });

        setMessage(`Calculator #${json.item.id} created.`, "ok");
        await loadCalculators();
        await openCalculator(json.item.id);
      } catch (error) {
        setMessage(error.message, "bad");
      } finally {
        createCalculatorButton.disabled = false;
      }
    }

    function renderCalculators(items) {
      const siteCalculatorSelect = siteForm.elements.calculatorId;
      const selectedCalculatorId = siteCalculatorSelect.value;
      siteCalculatorSelect.innerHTML = `<option value="">No calculator</option>${items.map((item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`
      ).join("")}`;
      siteCalculatorSelect.value = selectedCalculatorId;

      if (!items.length) {
        calculatorList.innerHTML = '<div class="muted">No calculators yet.</div>';
        return;
      }

      calculatorList.innerHTML = items.map((item) => `
        <div class="calculator-item">
          <strong>#${escapeHtml(item.id)} ${escapeHtml(item.title)}</strong>
          <span class="muted">${escapeHtml(item.ownerName || "")} · ${item.isEnabled ? "enabled" : "disabled"}</span>
          <div class="calculator-actions">
            <button type="button" data-calculator-open="${escapeHtml(item.id)}">Preview</button>
            <button class="secondary" type="button" data-calculator-publish="${escapeHtml(item.id)}">Publish/embed</button>
          </div>
        </div>
      `).join("");

      for (const button of calculatorList.querySelectorAll("[data-calculator-open]")) {
        button.addEventListener("click", () => openCalculator(Number(button.dataset.calculatorOpen)));
      }
      for (const button of calculatorList.querySelectorAll("[data-calculator-publish]")) {
        button.addEventListener("click", () => publishCalculator(Number(button.dataset.calculatorPublish)));
      }
    }

    async function openCalculator(calculatorId) {
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      calculatorPreview.innerHTML = '<div class="muted">Loading calculator...</div>';

      try {
        const json = await adminFetchJson(`/api/calculators/${calculatorId}`, {
          fallbackMessage: "Calculator was not loaded."
        });

        activeCalculator = json.item;
        renderCalculatorPreview(activeCalculator);
        await loadPricing(calculatorId);
      } catch (error) {
        calculatorPreview.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
        setMessage(error.message, "bad");
      }
    }

    async function publishCalculator(calculatorId) {
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      try {
        const json = await adminFetchJson(`/api/calculators/${calculatorId}/publish`, {
          method: "POST",
          payload: { enabled: true },
          fallbackMessage: "Embed code was not generated."
        });

        embedCode.value = json.embedCode || "";
        setMessage(`Embed code generated for calculator #${calculatorId}.`, "ok");
        await loadCalculators();
        await openCalculator(calculatorId);
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    function renderCalculatorPreview(calculator) {
      const firstCategory = calculator.categories[0];
      const estimate = firstCategory
        ? firstCategory.basePrice + firstCategory.unitPrice * Math.max(firstCategory.minUnits, 1)
        : 0;

      calculatorPreview.innerHTML = `
        <div class="calculator-item">
          <strong>${escapeHtml(calculator.title)}</strong>
          <span class="muted">${escapeHtml(calculator.description || "")}</span>
          <label>
            Category
            <select>
              ${(calculator.categories || []).map((category) => `<option>${escapeHtml(category.name)} · ${formatMoney(category.basePrice + category.unitPrice * Math.max(category.minUnits, 1))}</option>`).join("")}
            </select>
          </label>
          <label>
            Size
            <input type="number" value="${escapeHtml(firstCategory?.minUnits || 1)}" readonly />
          </label>
          <div class="progress">Preview estimate: ${formatMoney(estimate)} ${escapeHtml(calculator.currency || "")}</div>
        </div>
      `;
    }

    async function loadPricing(calculatorId) {
      const token = getToken();
      pricingEditor.innerHTML = '<div class="muted">Loading pricing...</div>';

      try {
        const json = await adminFetchJson(`/api/calculators/${calculatorId}/pricing`, {
          fallbackMessage: "Pricing was not loaded."
        });

        activePricing = json;
        renderPricingEditor(json);
      } catch (error) {
        pricingEditor.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
      }
    }

    function renderPricingEditor(pricing) {
      const prices = pricing.draft?.prices || [];
      const rules = pricing.draft?.rules || [];
      const fields = pricing.draft?.fields || [];
      const firstPrice = prices[0];
      const materialRule = rules.find((rule) => rule.ruleType === "multiplier") || rules[0];

      pricingEditor.innerHTML = `
        <div class="project-head">
          <h2>Pricing draft</h2>
          <div class="progress">Published rows: ${(pricing.published?.prices || []).length}</div>
        </div>
        <form id="pricing-form" class="pricing-editor">
          <div>
            <strong>Prices</strong>
            ${prices.map((price) => `
              <div class="pricing-row" data-price-code="${escapeHtml(price.code)}">
                <label>Category
                  <input name="label" value="${escapeHtml(price.name)}" />
                </label>
                <label>Base
                  <input name="basePrice" type="number" min="0" step="1000" value="${escapeHtml(price.basePrice)}" />
                </label>
                <label>Unit
                  <input name="unitPrice" type="number" min="0" step="1000" value="${escapeHtml(price.unitPrice)}" />
                </label>
                <label>Min
                  <input name="minUnits" type="number" min="0.1" step="0.1" value="${escapeHtml(price.minUnits)}" />
                </label>
              </div>
            `).join("")}
          </div>
          <div>
            <strong>Rules</strong>
            ${rules.map((rule) => `
              <div class="rule-row" data-rule-code="${escapeHtml(rule.code)}" data-rule-type="${escapeHtml(rule.ruleType)}">
                <label>Rule
                  <input name="label" value="${escapeHtml(rule.label)}" />
                </label>
                <label>Type
                  <select name="ruleType">
                    ${["multiplier", "fixed_addon", "percent_discount"].map((type) => `<option value="${type}" ${type === rule.ruleType ? "selected" : ""}>${type}</option>`).join("")}
                  </select>
                </label>
                <label>Value
                  <input name="value" type="number" min="0" step="0.01" value="${escapeHtml(rule.value)}" />
                </label>
              </div>
            `).join("")}
          </div>
          <div>
            <strong>Published form fields</strong>
            ${fields.map((field) => `
              <div class="field-row" data-field-code="${escapeHtml(field.fieldCode)}">
                <label>Label
                  <input name="label" value="${escapeHtml(field.label)}" />
                </label>
                <label>Type
                  <select name="fieldType">
                    ${["select", "number", "text", "tel", "textarea"].map((type) => `<option value="${type}" ${type === field.fieldType ? "selected" : ""}>${type}</option>`).join("")}
                  </select>
                </label>
                <label>Role
                  <select name="role">
                    ${["pricing_input", "lead_input", "display_only"].map((role) => `<option value="${role}" ${role === field.role ? "selected" : ""}>${role}</option>`).join("")}
                  </select>
                </label>
                <label>Binding
                  <select name="binding">
                    ${["categoryCode", "units", "materialRuleCode", "name", "phone", "city", "comment"].map((binding) => `<option value="${binding}" ${binding === field.binding ? "selected" : ""}>${binding}</option>`).join("")}
                  </select>
                </label>
                <label class="checkbox-label"><input name="isRequired" type="checkbox" ${field.isRequired ? "checked" : ""} />Required</label>
                <label class="checkbox-label"><input name="isActive" type="checkbox" ${field.isActive !== 0 ? "checked" : ""} />Active</label>
              </div>
            `).join("")}
          </div>
          <div class="pricing-row">
            <label>Preview category
              <select name="previewCategory">
                ${prices.map((price) => `<option value="${escapeHtml(price.code)}">${escapeHtml(price.name)}</option>`).join("")}
              </select>
            </label>
            <label>Size
              <input name="previewUnits" type="number" min="0.1" step="0.1" value="${escapeHtml(firstPrice?.minUnits || 1)}" />
            </label>
            <label>Material
              <select name="previewRule">
                ${rules.filter((rule) => rule.ruleType === "multiplier").map((rule) => `<option value="${escapeHtml(rule.code)}" ${rule.code === materialRule?.code ? "selected" : ""}>${escapeHtml(rule.label)}</option>`).join("")}
              </select>
            </label>
            <label>Result
              <input name="previewResult" readonly />
            </label>
          </div>
          <div class="pricing-tools">
            <button type="submit">Save draft</button>
            <button class="secondary" type="button" id="pricing-preview">Preview</button>
            <button class="secondary" type="button" id="pricing-publish">Publish/embed</button>
          </div>
        </form>
      `;

      const form = document.querySelector("#pricing-form");
      form.addEventListener("submit", savePricingDraft);
      document.querySelector("#pricing-preview").addEventListener("click", previewPricing);
      document.querySelector("#pricing-publish").addEventListener("click", () => publishCalculator(activeCalculator.id));
    }

    function collectPricingPayload() {
      const priceRows = [...pricingEditor.querySelectorAll("[data-price-code]")];
      const ruleRows = [...pricingEditor.querySelectorAll("[data-rule-code]")];
      const fieldRows = [...pricingEditor.querySelectorAll("[data-field-code]")];

      return {
        prices: priceRows.map((row, index) => ({
          code: row.dataset.priceCode,
          name: row.querySelector('[name="label"]').value,
          basePrice: Number(row.querySelector('[name="basePrice"]').value),
          unitLabel: activePricing.draft.prices[index]?.unitLabel || "unit",
          unitPrice: Number(row.querySelector('[name="unitPrice"]').value),
          minUnits: Number(row.querySelector('[name="minUnits"]').value),
          sortOrder: activePricing.draft.prices[index]?.sortOrder || (index + 1) * 10
        })),
        rules: ruleRows.map((row, index) => ({
          code: row.dataset.ruleCode,
          label: row.querySelector('[name="label"]').value,
          ruleType: row.querySelector('[name="ruleType"]').value,
          value: Number(row.querySelector('[name="value"]').value),
          sortOrder: activePricing.draft.rules[index]?.sortOrder || (index + 1) * 10
        })),
        fields: fieldRows.map((row, index) => {
          const previous = activePricing.draft.fields[index] || {};
          const binding = row.querySelector('[name="binding"]').value;
          return {
            fieldCode: row.dataset.fieldCode,
            label: row.querySelector('[name="label"]').value,
            fieldType: row.querySelector('[name="fieldType"]').value,
            role: row.querySelector('[name="role"]').value,
            binding,
            optionsSource: binding === "categoryCode" ? "prices" : binding === "materialRuleCode" ? "multiplier_rules" : null,
            defaultValue: previous.defaultValue || "",
            minValue: previous.minValue,
            maxValue: previous.maxValue,
            sortOrder: previous.sortOrder || (index + 1) * 10,
            isRequired: row.querySelector('[name="isRequired"]').checked,
            isActive: row.querySelector('[name="isActive"]').checked
          };
        })
      };
    }

    async function savePricingDraft(event) {
      event.preventDefault();

      try {
        const json = await adminFetchJson(`/api/calculators/${activeCalculator.id}/pricing`, {
          method: "PUT",
          payload: collectPricingPayload(),
          fallbackMessage: "Pricing was not saved."
        });

        activePricing = json;
        renderPricingEditor(json);
        setMessage("Pricing draft saved.", "ok");
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    async function previewPricing() {
      const form = document.querySelector("#pricing-form");

      try {
        const json = await adminFetchJson(`/api/calculators/${activeCalculator.id}/preview`, {
          method: "POST",
          payload: {
            categoryCode: form.elements.previewCategory.value,
            units: Number(form.elements.previewUnits.value),
            materialRuleCode: form.elements.previewRule.value
          },
          fallbackMessage: "Preview was not calculated."
        });

        form.elements.previewResult.value = `${formatMoney(json.estimate)} ${json.currency}`;
        setMessage("Pricing preview calculated.", "ok");
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    // Portfolio
    async function loadPortfolio(category = "") {
      if (!getToken()) {
        renderPortfolio([], []);
        return;
      }

      refreshPortfolioButton.disabled = true;

      try {
        const params = new URLSearchParams();
        if (category) {
          params.set("category", category);
        }
        const json = await adminFetchJson(`/api/portfolio${params.toString() ? `?${params}` : ""}`, {
          fallbackMessage: "Portfolio was not loaded."
        });

        renderPortfolio(json.items || [], json.categories || [], category);
      } catch (error) {
        portfolioList.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
      } finally {
        refreshPortfolioButton.disabled = false;
      }
    }

    async function createPortfolioItem(event) {
      event.preventDefault();
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      const button = portfolioForm.querySelector("button");
      const photo = portfolioForm.elements.photo?.files?.[0];
      button.disabled = true;

      try {
        const json = await adminFetchJson("/api/portfolio", {
          method: "POST",
          payload: {
            title: portfolioForm.elements.title.value,
            description: portfolioForm.elements.description.value,
            categoryCode: portfolioForm.elements.categoryCode.value,
            sortOrder: Number(portfolioForm.elements.sortOrder.value),
            isFeatured: portfolioForm.elements.isFeatured.checked,
            imageUrls: portfolioForm.elements.imageUrls.value
          },
          fallbackMessage: "Portfolio item was not created."
        });

        if (photo) {
          await uploadPortfolioFile(json.item.id, photo);
        }

        setMessage(`Portfolio item #${json.item.id} created${photo ? " and photo uploaded" : ""}.`, "ok");
        portfolioForm.elements.imageUrls.value = "";
        if (portfolioForm.elements.photo) {
          portfolioForm.elements.photo.value = "";
        }
        await loadPortfolio("");
      } catch (error) {
        setMessage(error.message, "bad");
      } finally {
        button.disabled = false;
      }
    }

    function renderPortfolio(items, categories, activeCategory = "") {
      if (categories.length) {
        portfolioCategorySelect.innerHTML = categories.map((category) => `
          <option value="${escapeHtml(category.code)}">${escapeHtml(category.name)}</option>
        `).join("");
        portfolioFilters.innerHTML = `
          <button type="button" data-portfolio-filter="" ${activeCategory ? "" : "disabled"}>All</button>
          ${categories.map((category) => `
            <button class="secondary" type="button" data-portfolio-filter="${escapeHtml(category.code)}" ${activeCategory === category.code ? "disabled" : ""}>${escapeHtml(category.name)}</button>
          `).join("")}
        `;
        for (const button of portfolioFilters.querySelectorAll("[data-portfolio-filter]")) {
          button.addEventListener("click", () => loadPortfolio(button.dataset.portfolioFilter));
        }
      }

      if (!items.length) {
        portfolioList.innerHTML = '<div class="muted">No portfolio works yet.</div>';
        return;
      }

      portfolioList.innerHTML = items.map((item) => {
        const image = item.images?.[0];
        return `
          <div class="portfolio-item">
            ${image ? `<img class="portfolio-thumb" src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.altText || item.title)}" loading="lazy" />` : ""}
            <strong>#${escapeHtml(item.id)} ${escapeHtml(item.title)}</strong>
            <span class="muted">${escapeHtml(item.categoryName || item.categoryCode)} · ${escapeHtml(item.status)} · ${(item.images || []).length} photos</span>
            <span class="muted">${escapeHtml(item.description || "")}</span>
            <div class="portfolio-actions">
              <button type="button" data-portfolio-publish="${escapeHtml(item.id)}">${item.status === "published" ? "Unpublish" : "Publish"}</button>
              <button class="secondary" type="button" data-portfolio-upload-image="${escapeHtml(item.id)}">Upload photo</button>
              <button class="secondary" type="button" data-portfolio-add-image="${escapeHtml(item.id)}">Add photos</button>
            </div>
          </div>
        `;
      }).join("");

      for (const button of portfolioList.querySelectorAll("[data-portfolio-publish]")) {
        button.addEventListener("click", () => togglePortfolioPublish(Number(button.dataset.portfolioPublish), button.textContent !== "Unpublish"));
      }
      for (const button of portfolioList.querySelectorAll("[data-portfolio-add-image]")) {
        button.addEventListener("click", () => addPortfolioImages(Number(button.dataset.portfolioAddImage)));
      }
      for (const button of portfolioList.querySelectorAll("[data-portfolio-upload-image]")) {
        button.addEventListener("click", () => uploadPortfolioImage(Number(button.dataset.portfolioUploadImage)));
      }
    }

    async function togglePortfolioPublish(itemId, published) {
      try {
        await adminFetchJson(`/api/portfolio/${itemId}/publish`, {
          method: "POST",
          payload: { published },
          fallbackMessage: "Portfolio publish state was not updated."
        });

        setMessage(`Portfolio item #${itemId} ${published ? "published" : "unpublished"}.`, "ok");
        await loadPortfolio("");
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    async function addPortfolioImages(itemId) {
      const value = window.prompt("Paste one or more image URLs separated by spaces or new lines:");
      if (!value) {
        return;
      }

      try {
        await adminFetchJson(`/api/portfolio/${itemId}/images`, {
          method: "POST",
          payload: { imageUrls: value },
          fallbackMessage: "Portfolio images were not added."
        });

        setMessage(`Photos added to portfolio item #${itemId}.`, "ok");
        await loadPortfolio("");
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    async function uploadPortfolioImage(itemId) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          return;
        }

        try {
          await uploadPortfolioFile(itemId, file);
          setMessage(`Photo uploaded to portfolio item #${itemId}.`, "ok");
          await loadPortfolio("");
        } catch (error) {
          setMessage(error.message, "bad");
        }
      }, { once: true });
      input.click();
    }

    async function uploadPortfolioFile(itemId, file) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("altText", file.name);
      return adminFetchFormData(`/api/portfolio/${itemId}/images/upload`, {
        method: "POST",
        formData,
        fallbackMessage: "Portfolio image was not uploaded."
      });
    }

    // Landing sites & VPS
    async function loadSites() {
      if (!getToken()) {
        renderSites([]);
        return;
      }

      refreshSitesButton.disabled = true;

      try {
        const json = await adminFetchJson("/api/sites", {
          fallbackMessage: "Sites were not loaded."
        });

        renderSites(json.items || []);
      } catch (error) {
        siteList.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
      } finally {
        refreshSitesButton.disabled = false;
      }
    }

    async function createSite(event) {
      event.preventDefault();
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      const button = siteForm.querySelector("button");
      button.disabled = true;

      try {
        const siteId = Number(siteForm.elements.siteId.value) || null;
        const json = await adminFetchJson(siteId ? `/api/sites/${siteId}` : "/api/sites", {
          method: siteId ? "PUT" : "POST",
          payload: {
            name: siteForm.elements.name.value,
            slug: siteForm.elements.slug.value,
            ownerName: siteForm.elements.ownerName.value,
            domain: siteForm.elements.domain.value,
            templateKey: siteForm.elements.templateKey.value,
            brief: collectSiteBrief()
          },
          fallbackMessage: siteId ? "Site was not updated." : "Site was not created."
        });

        activeSite = json.item;
        setMessage(`Site #${json.item.id} ${siteId ? "updated" : "created"}.`, "ok");
        fillSiteForm(json.item);
        await loadSites();
        previewSite(json.item.id);
      } catch (error) {
        setMessage(error.message, "bad");
      } finally {
        button.disabled = false;
      }
    }

    function renderSites(items) {
      if (!items.length) {
        siteList.innerHTML = '<div class="muted">No landing sites yet.</div>';
        return;
      }

      siteList.innerHTML = items.map((item) => `
        <div class="site-item">
          <strong>#${escapeHtml(item.id)} ${escapeHtml(item.name)}</strong>
          <span class="muted">${escapeHtml(item.slug)} · ${escapeHtml(item.status)} · SSL ${escapeHtml(item.sslStatus || "unknown")}</span>
          <span class="muted">${escapeHtml(item.domain || "No domain")}</span>
          <div class="site-actions">
            <button type="button" data-site-edit="${escapeHtml(item.id)}">Edit</button>
            <button class="secondary" type="button" data-site-preview="${escapeHtml(item.id)}">Preview</button>
            <button class="secondary" type="button" data-site-status="${escapeHtml(item.id)}">Status</button>
            <button class="secondary" type="button" data-site-deploy="${escapeHtml(item.id)}">Publish live</button>
            ${item.domain ? `<a href="https://${escapeHtml(item.domain)}" target="_blank" rel="noreferrer">Open</a>` : ""}
          </div>
        </div>
      `).join("");

      for (const button of siteList.querySelectorAll("[data-site-edit]")) {
        button.addEventListener("click", () => editSite(Number(button.dataset.siteEdit)));
      }
      for (const button of siteList.querySelectorAll("[data-site-preview]")) {
        button.addEventListener("click", () => previewSite(Number(button.dataset.sitePreview)));
      }
      for (const button of siteList.querySelectorAll("[data-site-status]")) {
        button.addEventListener("click", () => loadSiteStatus(Number(button.dataset.siteStatus)));
      }
      for (const button of siteList.querySelectorAll("[data-site-deploy]")) {
        button.addEventListener("click", () => deploySite(Number(button.dataset.siteDeploy)));
      }
    }

    function collectSiteBrief() {
      return {
        businessName: siteForm.elements.businessName.value,
        ownerName: siteForm.elements.ownerName.value,
        phone: siteForm.elements.phone.value,
        whatsapp: siteForm.elements.whatsapp.value,
        city: siteForm.elements.city.value,
        primaryOffer: siteForm.elements.primaryOffer.value,
        audience: siteForm.elements.audience.value,
        furnitureTypes: lines(siteForm.elements.furnitureTypes.value),
        advantages: lines(siteForm.elements.advantages.value),
        sections: ["services", "advantages", "contacts"],
        accentColor: siteForm.elements.accentColor.value,
        ctaLabel: siteForm.elements.ctaLabel.value,
        portfolioRequired: siteForm.elements.portfolioRequired.checked,
        calculatorRequired: siteForm.elements.calculatorRequired.checked,
        calculatorId: Number(siteForm.elements.calculatorId.value) || null,
        notes: siteForm.elements.notes.value
      };
    }

    async function editSite(siteId) {
      try {
        const json = await adminFetchJson(`/api/sites/${siteId}`, { fallbackMessage: "Site was not loaded." });
        activeSite = json.item;
        fillSiteForm(json.item);
        previewSite(siteId);
        siteForm.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    function fillSiteForm(site) {
      const brief = site.brief || {};
      siteForm.elements.siteId.value = site.id || "";
      siteForm.elements.name.value = site.name || "";
      siteForm.elements.slug.value = site.slug || "";
      siteForm.elements.ownerName.value = site.ownerName || "";
      siteForm.elements.domain.value = site.domains?.find((item) => item.isPrimary)?.domain || "";
      siteForm.elements.templateKey.value = site.templateKey || "default-furniture";
      for (const field of ["businessName", "city", "phone", "whatsapp", "primaryOffer", "audience", "accentColor", "ctaLabel", "notes"]) {
        siteForm.elements[field].value = brief[field] || (field === "accentColor" ? "#116466" : "");
      }
      siteForm.elements.furnitureTypes.value = (brief.furnitureTypes || []).join("\n");
      siteForm.elements.advantages.value = (brief.advantages || []).join("\n");
      siteForm.elements.portfolioRequired.checked = brief.portfolioRequired !== false;
      siteForm.elements.calculatorRequired.checked = Boolean(brief.calculatorRequired);
      siteForm.elements.calculatorId.value = brief.calculatorId || "";
      document.querySelector("#site-save").textContent = "Save site";
    }

    function resetSiteForm() {
      activeSite = null;
      siteForm.reset();
      siteForm.elements.siteId.value = "";
      siteForm.elements.accentColor.value = "#116466";
      document.querySelector("#site-save").textContent = "Create site";
      sitePreview.removeAttribute("src");
    }

    function previewSite(siteId) {
      sitePreview.src = `/api/sites/${siteId}/artifact?preview=${Date.now()}`;
      siteOutput.textContent = `Exact artifact preview for site #${siteId}`;
    }

    function lines(value) {
      return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    }

    async function loadSiteStatus(siteId) {
      await callSiteApi({
        path: `/api/sites/${siteId}/status`,
        loadingText: "Loading site status..."
      });
    }

    async function deploySite(siteId) {
      await callSiteApi({
        path: `/api/sites/${siteId}/deploy`,
        method: "POST",
        loadingText: "Starting live site publish...",
        payload: {
          dryRun: false
        }
      });
      await loadSites();
    }

    async function callSiteApi({ path, method = "GET", payload, loadingText }) {
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      siteOutput.textContent = loadingText;

      try {
        const json = await adminFetchJson(path, {
          method,
          payload,
          fallbackMessage: "Site request failed."
        });

        siteOutput.textContent = JSON.stringify(json, null, 2);
        setMessage("Site request completed.", "ok");
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    async function loadVpsHealth() {
      await callVpsApi({
        path: "/api/vps/health",
        loadingText: "Checking VPS health..."
      });
    }

    async function loadVpsServices() {
      await callVpsApi({
        path: "/api/vps/services",
        loadingText: "Loading VPS services..."
      });
    }

    async function loadVpsLogs() {
      const form = vpsDeployForm;
      const params = new URLSearchParams({
        siteSlug: form.elements.siteSlug.value,
        limit: "50"
      });

      await callVpsApi({
        path: `/api/vps/deploy/logs?${params}`,
        loadingText: "Loading deploy logs..."
      });
    }

    async function deployVpsSite(event) {
      event.preventDefault();
      const form = event.currentTarget;

      await callVpsApi({
        path: "/api/vps/deploy/site",
        method: "POST",
        loadingText: "Starting VPS deploy...",
        payload: {
          siteSlug: form.elements.siteSlug.value,
          sourceUrl: form.elements.sourceUrl.value,
          targetPath: form.elements.targetPath.value,
          dryRun: form.elements.dryRun.checked
        }
      });
    }

    async function reloadVpsWebserver() {
      await callVpsApi({
        path: "/api/vps/reload/webserver",
        method: "POST",
        loadingText: "Reloading webserver...",
        payload: {
          webserver: vpsDeployForm.elements.webserver.value
        }
      });
    }

    async function callVpsApi({ path, method = "GET", payload, loadingText }) {
      const token = getToken();
      if (!token) {
        setMessage("Введите admin token.", "bad");
        return;
      }

      vpsOutput.textContent = loadingText;

      try {
        const json = await adminFetchJson(path, {
          method,
          payload,
          fallbackMessage: "VPS control request failed."
        });

        vpsOutput.textContent = JSON.stringify(json, null, 2);
        setMessage("VPS control request completed.", "ok");
      } catch (error) {
        setMessage(error.message, "bad");
      }
    }

    // Shared admin helpers
    async function adminFetchJson(path, { method = "GET", payload, fallbackMessage = "Admin request failed." } = {}) {
      const token = readAdminToken();
      if (!token) {
        throw new Error("Введите admin token.");
      }

      const headers = { "X-Admin-Token": token };
      if (payload !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      const response = await adminFetchRequest(path, {
        method,
        headers,
        body: payload !== undefined ? JSON.stringify(payload) : undefined
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || fallbackMessage);
      }

      return json;
    }

    async function adminFetchFormData(path, { method = "POST", formData, fallbackMessage = "Admin request failed." } = {}) {
      const token = readAdminToken();
      if (!token) {
        throw new Error("Введите admin token.");
      }

      const response = await adminFetchRequest(path, {
        method,
        headers: { "X-Admin-Token": token },
        body: formData
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || fallbackMessage);
      }

      return json;
    }

    async function adminFetchRequest(path, options) {
      return fetch(path, options);
    }

    function readAdminToken() {
      return getToken();
    }

    function handleAdminError(error) {
      setMessage(error.message, "bad");
    }

    function setLoadingState(element, isLoading) {
      if (element) {
        element.disabled = Boolean(isLoading);
      }
    }

    function getToken() {
      return tokenInput.value.trim();
    }

    function renderEmpty(text) {
      tbody.innerHTML = `<tr><td colspan="12" class="muted">${escapeHtml(text)}</td></tr>`;
    }

    function setMessage(text, kind = "") {
      message.textContent = text;
      message.className = `status-line ${kind}`.trim();
    }

    function formatMoney(value) {
      if (value === null || value === undefined || value === "") {
        return "";
      }

      return new Intl.NumberFormat("ru-KZ").format(value);
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
