const DEFAULT_COMPANY = Object.freeze({
  name: "Мебельная компания",
  address: "Адрес компании",
  phone: "Телефон",
  email: "email@example.com",
  logoUrl: ""
});

const DEFAULT_TERMS = Object.freeze({
  productionDays: null,
  installationDays: null,
  warrantyMonths: null,
  note: ""
});

function text(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeLogoUrl(value) {
  const url = text(value);
  if (!url) return "";
  if (/^https:\/\//i.test(url) || /^data:image\/(?:png|jpeg|webp);base64,/i.test(url)) return url;
  return "";
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(number(value));
}

function normalizeItem(item = {}, index = 0) {
  const quantity = number(item.quantity, 1) || 1;
  const unitPrice = number(item.unitPrice ?? item.unit_price, 0);
  return {
    position: index + 1,
    name: text(item.name, "Позиция без названия"),
    specification: text(item.specification ?? item.description),
    unit: text(item.unit, "шт"),
    quantity,
    unitPrice,
    total: quantity * unitPrice
  };
}

export function normalizeCommercialProposal(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const companyInput = source.company && typeof source.company === "object" ? source.company : {};
  const customerInput = source.customer && typeof source.customer === "object" ? source.customer : {};
  const termsInput = source.terms && typeof source.terms === "object" ? source.terms : {};
  const items = Array.isArray(source.items) ? source.items.map(normalizeItem) : [];
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  return {
    proposalNumber: text(source.proposalNumber ?? source.proposal_number),
    date: text(source.date, new Intl.DateTimeFormat("ru-RU").format(new Date())),
    title: text(source.title, "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ"),
    company: {
      name: text(companyInput.name, DEFAULT_COMPANY.name),
      address: text(companyInput.address, DEFAULT_COMPANY.address),
      phone: text(companyInput.phone, DEFAULT_COMPANY.phone),
      email: text(companyInput.email, DEFAULT_COMPANY.email),
      logoUrl: safeLogoUrl(companyInput.logoUrl ?? companyInput.logo_url)
    },
    customer: {
      name: text(customerInput.name, "Не указан"),
      contact: text(customerInput.contact ?? customerInput.representative),
      project: text(customerInput.project)
    },
    items,
    subtotal,
    total: source.total === null || source.total === undefined ? subtotal : number(source.total, subtotal),
    totalLabel: text(source.totalLabel ?? source.total_label, "Итого в тенге:"),
    terms: {
      productionDays: optionalNumber(termsInput.productionDays ?? termsInput.production_days),
      installationDays: optionalNumber(termsInput.installationDays ?? termsInput.installation_days),
      warrantyMonths: optionalNumber(termsInput.warrantyMonths ?? termsInput.warranty_months),
      note: text(termsInput.note, DEFAULT_TERMS.note)
    },
    directorName: text(source.directorName ?? source.director_name, "Ф.И.О. директора")
  };
}

function renderLogo(company) {
  if (company.logoUrl) {
    return `<img class="company-logo" src="${escapeHtml(company.logoUrl)}" alt="Логотип ${escapeHtml(company.name)}">`;
  }
  const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return `<div class="logo-placeholder" aria-label="Место для логотипа">${escapeHtml(initials || "М")}</div>`;
}

function renderRows(items) {
  if (!items.length) {
    return '<tr><td colspan="7" class="empty-row">Добавьте позиции коммерческого предложения</td></tr>';
  }
  return items.map((item) => `
    <tr>
      <td class="num">${item.position}</td>
      <td class="item-name">${escapeHtml(item.name)}</td>
      <td class="specification">${escapeHtml(item.specification)}</td>
      <td class="center">${escapeHtml(item.unit)}</td>
      <td class="center">${formatMoney(item.quantity)}</td>
      <td class="money">${formatMoney(item.unitPrice)}</td>
      <td class="money">${formatMoney(item.total)}</td>
    </tr>`).join("");
}

function termValue(value, suffix) {
  return value === null ? "не указан" : `${formatMoney(value)} ${suffix}`;
}

export function renderCommercialProposalHtml(input = {}) {
  const proposal = normalizeCommercialProposal(input);
  const numberSuffix = proposal.proposalNumber ? ` № ${escapeHtml(proposal.proposalNumber)}` : "";
  const customerDetails = [proposal.customer.contact, proposal.customer.project].filter(Boolean)
    .map((value) => `<div>${escapeHtml(value)}</div>`).join("");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(proposal.title)}${numberSuffix}</title>
  <style>
    @page { size: A4; margin: 14mm 14mm 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; background: #fff; font-family: Arial, "Segoe UI", sans-serif; font-size: 10px; line-height: 1.35; }
    .sheet { width: 100%; max-width: 182mm; margin: 0 auto; }
    .heading { display: grid; grid-template-columns: 1fr 210px; gap: 24px; align-items: end; margin: 7mm 0 4mm; }
    .heading-title { text-align: center; }
    .heading-title .company-name { font-size: 14px; font-weight: 700; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 15px; line-height: 1.2; }
    .company-card { text-align: center; font-size: 9px; }
    .company-logo { display: block; width: 78px; height: 78px; object-fit: contain; margin: 0 auto 5px; }
    .logo-placeholder { display: grid; place-items: center; width: 68px; height: 68px; margin: 0 auto 6px; border: 2px solid #111; border-radius: 50%; font: 700 24px/1 Arial, sans-serif; }
    .company-card a { color: #1746c8; text-decoration: none; }
    .meta { display: grid; grid-template-columns: 1fr 210px; gap: 24px; align-items: start; margin-bottom: 5mm; }
    .meta-row { display: grid; grid-template-columns: 92px 1fr; gap: 6px; margin-bottom: 2px; }
    .meta-label { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #111; padding: 7px 5px; vertical-align: middle; }
    th { background: #d9d9d9; font-size: 9px; font-weight: 700; text-align: center; }
    tbody td { min-height: 34px; }
    .num { width: 4%; text-align: center; }
    .item-name { width: 21%; }
    .specification { width: 37%; white-space: pre-line; }
    .unit { width: 7%; }
    .qty { width: 6%; }
    .unit-price { width: 13%; }
    .line-total { width: 12%; }
    .center { text-align: center; }
    .money { text-align: right; white-space: nowrap; }
    .empty-row { height: 55px; text-align: center; color: #666; }
    .summary { margin-top: 11mm; }
    .summary td { padding: 3px 7px; font-weight: 700; }
    .summary-label { text-align: right; background: #f3f3f3; }
    .summary-total { width: 116px; text-align: right; }
    .terms { width: 66%; margin: 3mm 0 9mm 40px; font-weight: 700; }
    .terms td { padding: 2px 4px; }
    .signature { margin-left: 40px; font-size: 11px; font-weight: 700; }
    .signature-line { display: inline-block; width: 90px; margin: 0 6px; border-bottom: 1px solid #111; }
    .stamp { margin-left: 135px; font-size: 9px; font-weight: 400; }
    @media screen {
      body { background: #e9ecef; padding: 24px; }
      .sheet { min-height: 267mm; padding: 14mm; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,.13); }
    }
    @media print {
      tr, .summary, .terms, .signature { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="heading">
      <div class="heading-title">
        <div class="company-name">${escapeHtml(proposal.company.name)}</div>
        <h1>${escapeHtml(proposal.title)}${numberSuffix}</h1>
      </div>
      <div class="company-card">
        ${renderLogo(proposal.company)}
        <strong>${escapeHtml(proposal.company.name)}</strong><br>
        ${escapeHtml(proposal.company.address)}<br>
        ${escapeHtml(proposal.company.phone)}<br>
        <a href="mailto:${escapeHtml(proposal.company.email)}">${escapeHtml(proposal.company.email)}</a>
      </div>
    </section>

    <section class="meta">
      <div>
        <div class="meta-row"><span class="meta-label">Заказчик:</span><span>${escapeHtml(proposal.customer.name)}</span></div>
        ${customerDetails}
        <div class="meta-row"><span class="meta-label">Дата:</span><span>${escapeHtml(proposal.date)}</span></div>
      </div>
      <div></div>
    </section>

    <table aria-label="Спецификация коммерческого предложения">
      <colgroup>
        <col class="num"><col class="item-name"><col class="specification"><col class="unit"><col class="qty"><col class="unit-price"><col class="line-total">
      </colgroup>
      <thead>
        <tr>
          <th>№<br>п/п</th>
          <th>Наименование работ</th>
          <th>Тех. спецификация</th>
          <th>Ед. изм.</th>
          <th>Кол-во</th>
          <th>Стоимость за ед. в тенге</th>
          <th>Итого в тенге</th>
        </tr>
      </thead>
      <tbody>${renderRows(proposal.items)}</tbody>
    </table>

    <table class="summary" aria-label="Итог коммерческого предложения">
      <tr><td class="summary-label">${escapeHtml(proposal.totalLabel)}</td><td class="summary-total">${formatMoney(proposal.total)}</td></tr>
    </table>

    <table class="terms" aria-label="Условия предложения">
      <tr><td>Срок производства: ${termValue(proposal.terms.productionDays, "рабочих дней")}</td></tr>
      <tr><td>Срок монтажных работ: ${termValue(proposal.terms.installationDays, "рабочих дней")}</td></tr>
      <tr><td>Гарантийные обязательства: ${termValue(proposal.terms.warrantyMonths, "календарных месяцев")}</td></tr>
      <tr><td>Примечание: ${escapeHtml(proposal.terms.note)}</td></tr>
    </table>

    <div class="signature">Директор:<span class="signature-line"></span>${escapeHtml(proposal.directorName)}</div>
    <div class="stamp">М.П.</div>
  </main>
</body>
</html>`;
}
