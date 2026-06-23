import { PDF_PAGE_TYPES } from "./project-pdf-manifest.js";

export const PDF_PAGE_CLASSIFICATION_VERSION = "project-pdf-page-classification/v1";

const PAGE_TYPE_SET = new Set(PDF_PAGE_TYPES);

export function getDefaultPdfPageClassificationResult() {
  return {
    schemaVersion: PDF_PAGE_CLASSIFICATION_VERSION,
    pages: [],
    documentSummary: "",
    missingInfo: [],
    warnings: []
  };
}

export function buildPdfPageClassificationPrompt(manifest = {}, pageInputs = [], options = {}) {
  const pages = normalizePageInputs(manifest, pageInputs);
  const projectContext = cleanText(options.projectContext || options.context);
  const language = cleanText(options.language, "ru");

  return [
    "Ты анализируешь PDF дизайн-проекта для мебельной платформы.",
    "Считай, что документ относится к интерьеру, ремонту или мебели.",
    "Твоя задача - классифицировать страницы и отметить, где есть мебельные данные.",
    "Не придумывай размеры, материалы, помещения, цены или мебельные зоны.",
    "Если данных нет или они не читаются, используй unknown и missingInfo.",
    "Верни только валидный JSON без markdown и пояснений.",
    "",
    "Allowed pageType values:",
    "- floor_plan",
    "- elevation",
    "- visualization",
    "- specification",
    "- text",
    "- mixed",
    "- unknown",
    "",
    "Furniture context:",
    "- kitchens",
    "- wardrobes",
    "- walk-in closets",
    "- bathroom furniture",
    "- hallways",
    "- kids furniture",
    "- office furniture",
    "- TV zones",
    "- commercial furniture",
    "- storage/cabinets",
    "- other custom furniture",
    "",
    "Required JSON schema:",
    JSON.stringify(buildPromptSchema(), null, 2),
    "",
    `Language for short labels and summaries: ${language}`,
    `Project context: ${projectContext || "Не указано"}`,
    "",
    "Document manifest:",
    JSON.stringify(buildPromptManifest(manifest), null, 2),
    "",
    "Page inputs:",
    JSON.stringify(pages, null, 2)
  ].join("\n");
}

export function parsePdfPageClassificationResponse(rawContent, manifest = {}) {
  const fallback = getDefaultPdfPageClassificationResult();
  const source = stripCodeFence(rawContent);
  if (!source) return fallback;

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray(parsed.pages)) {
    return fallback;
  }

  const expectedPages = getExpectedPageNumbers(manifest);
  const pages = parsed.pages.map((page, index) => normalizeClassificationPage(page, index, expectedPages)).filter(Boolean);
  if (expectedPages.length > 0 && pages.length === 0) return fallback;

  return {
    schemaVersion: PDF_PAGE_CLASSIFICATION_VERSION,
    pages,
    documentSummary: cleanText(parsed.documentSummary ?? parsed.document_summary),
    missingInfo: normalizeStringArray(parsed.missingInfo ?? parsed.missing_info),
    warnings: normalizeStringArray(parsed.warnings)
  };
}

export function mergePageClassificationsIntoManifest(manifest = {}, classification = {}) {
  const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
  const classified = new Map(
    (Array.isArray(classification.pages) ? classification.pages : [])
      .map((page) => [Number(page.pageNumber), page])
  );

  return {
    ...manifest,
    pages: pages.map((page, index) => {
      const pageNumber = Number(page.pageNumber) || index + 1;
      const match = classified.get(pageNumber);
      if (!match) return { ...page };
      return {
        ...page,
        pageType: match.pageType,
        confidence: match.confidence,
        roomLabel: match.roomLabel || page.roomLabel || "",
        missingInfo: uniqueStrings([...(page.missingInfo || []), ...match.missingInfo]),
        warnings: uniqueStrings([...(page.warnings || []), ...match.warnings])
      };
    }),
    warnings: uniqueStrings([...(manifest.warnings || []), ...(classification.warnings || [])])
  };
}

function buildPromptSchema() {
  return {
    schemaVersion: PDF_PAGE_CLASSIFICATION_VERSION,
    documentSummary: "string",
    pages: [
      {
        pageNumber: "number",
        pageType: "floor_plan|elevation|visualization|specification|text|mixed|unknown",
        confidence: "number 0..1",
        roomLabel: "string",
        furnitureEvidence: ["string"],
        missingInfo: ["string"],
        warnings: ["string"]
      }
    ],
    missingInfo: ["string"],
    warnings: ["string"]
  };
}

function buildPromptManifest(manifest) {
  const document = manifest?.document || {};
  return omitEmpty({
    manifestVersion: cleanText(manifest?.manifestVersion),
    fileName: cleanText(document.fileName),
    pageCount: Number(manifest?.pageCount) || 0,
    pages: Array.isArray(manifest?.pages)
      ? manifest.pages.map((page) => omitEmpty({
        pageNumber: Number(page.pageNumber) || null,
        widthMm: page.widthMm ?? null,
        heightMm: page.heightMm ?? null,
        currentPageType: cleanText(page.pageType, "unknown")
      }))
      : []
  });
}

function normalizePageInputs(manifest, pageInputs) {
  const inputs = Array.isArray(pageInputs) ? pageInputs : [];
  const byPage = new Map(inputs.map((page, index) => [Number(page?.pageNumber ?? page?.page_number ?? index + 1), page]));
  const manifestPages = Array.isArray(manifest?.pages) ? manifest.pages : [];
  const pages = manifestPages.length > 0
    ? manifestPages.map((page, index) => ({ pageNumber: Number(page.pageNumber) || index + 1, manifestPage: page }))
    : inputs.map((page, index) => ({ pageNumber: Number(page?.pageNumber ?? page?.page_number) || index + 1, manifestPage: {} }));

  return pages.map(({ pageNumber, manifestPage }) => {
    const input = byPage.get(pageNumber) || {};
    return {
      pageNumber,
      currentPageType: cleanText(manifestPage.pageType, "unknown"),
      textExcerpt: limitText(input.textExcerpt ?? input.text_excerpt ?? input.text),
      imageDescription: limitText(input.imageDescription ?? input.image_description),
      notes: normalizeStringArray(input.notes)
    };
  });
}

function normalizeClassificationPage(input, index, expectedPages) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const fallbackPageNumber = expectedPages[index] || index + 1;
  const pageNumber = normalizePositiveInteger(input.pageNumber ?? input.page_number, fallbackPageNumber);
  if (expectedPages.length > 0 && !expectedPages.includes(pageNumber)) return null;
  return {
    pageNumber,
    pageType: normalizePageType(input.pageType ?? input.page_type),
    confidence: normalizeConfidence(input.confidence),
    roomLabel: cleanText(input.roomLabel ?? input.room_label),
    furnitureEvidence: normalizeStringArray(input.furnitureEvidence ?? input.furniture_evidence),
    missingInfo: normalizeStringArray(input.missingInfo ?? input.missing_info),
    warnings: normalizeStringArray(input.warnings)
  };
}

function getExpectedPageNumbers(manifest) {
  if (!Array.isArray(manifest?.pages)) return [];
  return manifest.pages.map((page, index) => Number(page.pageNumber) || index + 1);
}

function normalizePageType(value) {
  const type = cleanText(value).toLowerCase();
  return PAGE_TYPE_SET.has(type) ? type : "unknown";
}

function normalizeConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(1, Math.max(0, parsed));
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
  const single = cleanText(value);
  return single ? [single] : [];
}

function uniqueStrings(values) {
  return [...new Set(normalizeStringArray(values))];
}

function stripCodeFence(value) {
  const text = cleanText(value);
  if (!text) return "";
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
}

function limitText(value, maxLength = 1200) {
  const text = cleanText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function cleanText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
}

function omitEmpty(value) {
  if (Array.isArray(value)) return value.map(omitEmpty);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, omitEmpty(item)])
  );
}
