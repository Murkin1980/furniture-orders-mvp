import { getCalculatorEmbedCode, getPublishedCalculatorRuntime } from "../../../../src/calculators-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      const auth = requireAdminToken(context.request, context.env);
      if (auth) {
        return auth;
      }
    }

    const result = token
      ? await getPublishedCalculatorRuntime({
        db: context.env.DB,
        env: context.env,
        calculatorId: context.params.id,
        token
      })
      : await getCalculatorEmbedCode({
        db: context.env.DB,
        env: context.env,
        calculatorId: context.params.id,
        origin: url.origin
      });

    if (!result.ok) {
      return jsonResponse(result.body, result.status);
    }

    if (!token) {
      return jsonResponse(result.body, result.status);
    }

    return widgetResponse(renderWidgetScript({
      calculator: result.body.item,
      token
    }));
  } catch (error) {
    console.error("Calculator embed API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Calculator embed was not loaded. Please try again later."
      },
      500
    );
  }
}

export async function onRequest() {
  return jsonResponse(
    {
      success: false,
      error: "method_not_allowed",
      message: "Use GET /api/calculators/:id/embed."
    },
    405,
    {
      Allow: "GET, OPTIONS"
    }
  );
}

function renderWidgetScript({ calculator, token }) {
  const data = JSON.stringify({
    calculator,
    token
  });

  return `(() => {
  const data = ${data};
  const root = document.querySelector('[data-furniture-calculator="${calculator.id}"]') || document.currentScript.previousElementSibling;
  if (!root) return;

  const apiOrigin = new URL(document.currentScript.src).origin;
  const formatMoney = (value) => new Intl.NumberFormat("ru-KZ").format(value) + " " + data.calculator.currency;
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const estimate = (category, units, multiplier) => Math.round((Number(category.basePrice || 0) + Number(category.unitPrice || 0) * Math.max(Number(units) || 0, Number(category.minUnits) || 1)) * (Number(multiplier) || 1));

  root.innerHTML = \`
    <style>
      .fo-calculator { max-width: 520px; border: 1px solid #d8d2c7; border-radius: 8px; padding: 18px; font-family: Arial, sans-serif; color: #1f2426; background: #fff; }
      .fo-calculator h3 { margin: 0 0 6px; font-size: 22px; }
      .fo-calculator p { margin: 0 0 14px; color: #697275; }
      .fo-calculator label { display: grid; gap: 5px; margin-bottom: 10px; font-size: 13px; font-weight: 700; color: #3b403f; }
      .fo-calculator input, .fo-calculator select, .fo-calculator textarea { width: 100%; min-height: 40px; border: 1px solid #d8d2c7; border-radius: 6px; padding: 8px 10px; font: inherit; }
      .fo-calculator textarea { min-height: 72px; resize: vertical; }
      .fo-calculator button { width: 100%; min-height: 42px; border: 0; border-radius: 6px; background: #116466; color: #fff; font-weight: 700; cursor: pointer; }
      .fo-calculator .fo-estimate { margin: 12px 0; padding: 10px; border-radius: 6px; background: #f5f3ee; font-weight: 700; }
      .fo-calculator .fo-message { min-height: 22px; margin-top: 10px; color: #2f6e3e; }
      .fo-calculator .fo-message.bad { color: #9f2d23; }
    </style>
    <form class="fo-calculator">
      <h3>\${escapeHtml(data.calculator.title)}</h3>
      <p>\${escapeHtml(data.calculator.description || "")}</p>
      <label>Category
        <select name="categoryCode">
          \${data.calculator.categories.map((category) => \`<option value="\${escapeHtml(category.code)}">\${escapeHtml(category.name)}</option>\`).join("")}
        </select>
      </label>
      <label>Size
        <input name="units" type="number" min="0.1" step="0.1" value="\${escapeHtml(data.calculator.categories[0]?.minUnits || 1)}" />
      </label>
      <label>Material
        <select name="materialMultiplier">
          <option value="1">Standard</option>
          <option value="1.25">Premium</option>
          <option value="1.45">Premium plus</option>
        </select>
      </label>
      <div class="fo-estimate" data-estimate></div>
      <label>Name
        <input name="name" autocomplete="name" required />
      </label>
      <label>Phone
        <input name="phone" autocomplete="tel" required />
      </label>
      <label>City
        <input name="city" autocomplete="address-level2" />
      </label>
      <label>Comment
        <textarea name="comment"></textarea>
      </label>
      <button type="submit">Send calculation</button>
      <div class="fo-message" data-message></div>
    </form>\`;

  const form = root.querySelector("form");
  const estimateNode = root.querySelector("[data-estimate]");
  const messageNode = root.querySelector("[data-message]");
  const currentCategory = () => data.calculator.categories.find((category) => category.code === form.elements.categoryCode.value) || data.calculator.categories[0];
  const updateEstimate = () => {
    const category = currentCategory();
    estimateNode.textContent = "Estimated from " + formatMoney(estimate(category, form.elements.units.value, form.elements.materialMultiplier.value));
  };

  form.elements.categoryCode.addEventListener("change", updateEstimate);
  form.elements.units.addEventListener("input", updateEstimate);
  form.elements.materialMultiplier.addEventListener("change", updateEstimate);
  updateEstimate();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageNode.textContent = "Sending...";
    messageNode.className = "fo-message";

    try {
      const response = await fetch(apiOrigin + "/api/calculators/${calculator.id}/lead?token=" + encodeURIComponent(data.token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Calculation was not sent.");
      }

      messageNode.textContent = "Request saved. Estimate: " + formatMoney(json.estimate);
      form.reset();
      updateEstimate();
    } catch (error) {
      messageNode.textContent = error.message;
      messageNode.className = "fo-message bad";
    }
  });
})();`;
}

function requireAdminToken(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) {
    return jsonResponse(
      {
        success: false,
        error: "admin_not_configured",
        message: "ADMIN_TOKEN is not configured."
      },
      503
    );
  }

  const authorization = request.headers.get("Authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const headerToken = request.headers.get("X-Admin-Token");

  if (bearerToken === expected || headerToken === expected) {
    return null;
  }

  return jsonResponse(
    {
      success: false,
      error: "unauthorized",
      message: "Admin token is invalid or missing."
    },
    401
  );
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...headers,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function widgetResponse(body) {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
