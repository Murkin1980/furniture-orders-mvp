import { buildOpenAiCompatibleRequest, getAiProviderConfig } from "./providers.js";

export function buildReplySuggestionPrompt(order = {}) {
  const context = {
    furnitureType: clean(order.aiFurnitureType || order.furnitureType) || "other",
    description: clean(order.description) || "Не указано",
    city: clean(order.city) || "Не указано",
    budget: clean(order.budget) || "Не указано",
    aiSummary: clean(order.aiSummary) || "Не указано",
    aiNextQuestion: clean(order.aiNextQuestion) || "Не указано",
    aiMissingInfo: parseList(order.aiMissingInfoJson || order.aiMissingInfo),
    preferredChannel: clean(order.preferredChannel) || "messenger"
  };

  return [
    "Ты помощник менеджера мебельной компании в Алматы и области.",
    "Подготовь короткий, вежливый и конкретный черновик ответа клиенту.",
    "Не обещай цену, срок, скидку или выезд, если это не подтверждено.",
    "Задай один наиболее полезный следующий вопрос.",
    "Не упоминай AI и внутреннюю оценку лида.",
    "Верни только JSON:",
    '{"reply":"string","tone":"professional|friendly|concise","channel":"messenger|telegram|whatsapp","warnings":["string"]}',
    `Контекст: ${JSON.stringify(context)}`
  ].join("\n");
}
export function parseReplySuggestion(rawContent) {
  const fallback = getDefaultReplySuggestion();
  if (typeof rawContent !== "string" || !rawContent.trim()) return fallback;

  try {
    const parsed = JSON.parse(stripFence(rawContent));
    if (!parsed || typeof parsed !== "object" || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
      return fallback;
    }
    return {
      reply: parsed.reply.trim().slice(0, 2000),
      tone: ["professional", "friendly", "concise"].includes(parsed.tone) ? parsed.tone : "professional",
      channel: ["messenger", "telegram", "whatsapp"].includes(parsed.channel) ? parsed.channel : "messenger",
      warnings: parseList(parsed.warnings).slice(0, 10),
      requiresHumanApproval: true
    };
  } catch {
    return fallback;
  }
}

export function getDefaultReplySuggestion() {
  return {
    reply: "",
    tone: "professional",
    channel: "messenger",
    warnings: [],
    requiresHumanApproval: true
  };
}

export async function suggestReply(order, options = {}) {
  const env = options.env && typeof options.env === "object" ? options.env : {};
  const provider = getAiProviderConfig(options.providerName ?? env.AI_PROVIDER, env);
  const model = clean(options.model) || provider.defaultModel;

  try {
    const request = buildOpenAiCompatibleRequest({
      providerName: provider.id,
      model,
      prompt: buildReplySuggestionPrompt(order),
      env
    });
    if (typeof options.sendAiRequest !== "function") {
      return withMeta(getDefaultReplySuggestion(), provider.id, model, "sendAiRequest must be provided.");
    }
    const response = await options.sendAiRequest(request);
    return withMeta(parseReplySuggestion(extractContent(response)), provider.id, model);
  } catch (error) {
    return withMeta(
      getDefaultReplySuggestion(),
      provider.id,
      model,
      error instanceof Error ? error.message : "AI reply suggestion failed."
    );
  }
}

function withMeta(result, provider, model, error) {
  return {
    ...result,
    meta: {
      provider,
      model,
      requestBuilt: true,
      ...(error ? { error } : {})
    }
  };
}

function extractContent(response) {
  if (typeof response === "string") return response;
  if (typeof response?.content === "string") return response.content;
  return response?.choices?.[0]?.message?.content || "";
}

function stripFence(value) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function parseList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [clean(value)].filter(Boolean);
  } catch {
    return [clean(value)].filter(Boolean);
  }
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
