export const DEFAULT_PORTFOLIO_CATEGORIES = [
  { code: "kitchens", name: "Kitchens", sortOrder: 10 },
  { code: "wardrobes", name: "Wardrobes", sortOrder: 20 },
  { code: "dressers", name: "Dressers", sortOrder: 30 },
  { code: "hallways", name: "Hallways", sortOrder: 40 },
  { code: "closets", name: "Walk-in closets", sortOrder: 50 },
  { code: "cabinets", name: "Cabinets", sortOrder: 60 },
  { code: "kids", name: "Kids furniture", sortOrder: 70 },
  { code: "office", name: "Office furniture", sortOrder: 80 },
  { code: "tables", name: "Tables", sortOrder: 90 },
  { code: "other", name: "Other", sortOrder: 100 }
];

const PORTFOLIO_STATUSES = new Set(["draft", "published"]);
const PORTFOLIO_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const MAX_PORTFOLIO_IMAGE_BYTES = 5 * 1024 * 1024;

export function normalizePortfolioPayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  return {
    title: cleanText(payload.title),
    description: cleanText(payload.description),
    categoryCode: cleanSlug(payload.categoryCode) || "other",
    status: PORTFOLIO_STATUSES.has(cleanSlug(payload.status)) ? cleanSlug(payload.status) : "draft",
    sortOrder: normalizeInteger(payload.sortOrder, 0),
    isFeatured: payload.isFeatured === true || payload.isFeatured === 1 ? 1 : 0,
    images: normalizeImagePayloads(payload.images || payload.imageUrls || [])
  };
}

export async function listPortfolio({ db, env = {}, publicOnly = true, categoryCode = "" }) {
  assertDb(db);
  await ensurePortfolioSchema(db, env);

  const category = cleanSlug(categoryCode);
  const conditions = [];
  const values = [];

  if (publicOnly) {
    conditions.push("portfolio_items.status = ?");
    values.push("published");
  }

  if (category) {
    conditions.push("portfolio_items.category_code = ?");
    values.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await db
    .prepare(
      `SELECT
        portfolio_items.id,
        portfolio_items.title,
        portfolio_items.description,
        portfolio_items.category_code AS categoryCode,
        portfolio_categories.name AS categoryName,
        portfolio_items.status,
        portfolio_items.sort_order AS sortOrder,
        portfolio_items.is_featured AS isFeatured,
        portfolio_items.created_at AS createdAt,
        portfolio_items.updated_at AS updatedAt
       FROM portfolio_items
       LEFT JOIN portfolio_categories
         ON portfolio_categories.code = portfolio_items.category_code
       ${where}
       ORDER BY portfolio_items.is_featured DESC, portfolio_items.sort_order ASC, portfolio_items.created_at DESC, portfolio_items.id DESC`
    )
    .bind(...values)
    .all();

  const items = [];
  for (const item of result?.results || []) {
    items.push({
      ...item,
      isFeatured: Boolean(item.isFeatured),
      images: await listPortfolioImages(db, item.id)
    });
  }

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      categories: await listPortfolioCategories(db),
      items
    }
  };
}

export async function createPortfolioItem({ db, env = {}, payload }) {
  assertDb(db);
  await ensurePortfolioSchema(db, env);

  const normalized = normalizePortfolioPayload(payload);
  const errors = await validatePortfolioPayload(db, normalized);
  if (errors.length) {
    return validationResponse(errors);
  }

  const result = await db
    .prepare(
      `INSERT INTO portfolio_items (
        title, description, category_code, status, sort_order, is_featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(
      normalized.title,
      normalized.description,
      normalized.categoryCode,
      normalized.status,
      normalized.sortOrder,
      normalized.isFeatured
    )
    .run();

  const itemId = result?.meta?.last_row_id;
  if (!itemId) {
    throw new Error("Portfolio item was not created.");
  }

  if (normalized.images.length) {
    await replacePortfolioImages(db, itemId, normalized.images);
  }

  return getPortfolioItem({ db, env, itemId, publicOnly: false });
}

export async function getPortfolioItem({ db, env = {}, itemId, publicOnly = true }) {
  assertDb(db);
  await ensurePortfolioSchema(db, env);

  const normalizedItemId = normalizePositiveInteger(itemId);
  if (!normalizedItemId) {
    return itemIdError();
  }

  const item = await selectPortfolioItem(db, normalizedItemId);
  if (!item || (publicOnly && item.status !== "published")) {
    return itemNotFound();
  }

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      item: {
        ...item,
        isFeatured: Boolean(item.isFeatured),
        images: await listPortfolioImages(db, normalizedItemId)
      }
    }
  };
}

export async function updatePortfolioItem({ db, env = {}, itemId, payload }) {
  assertDb(db);
  await ensurePortfolioSchema(db, env);

  const normalizedItemId = normalizePositiveInteger(itemId);
  if (!normalizedItemId) {
    return itemIdError();
  }

  const existing = await selectPortfolioItem(db, normalizedItemId);
  if (!existing) {
    return itemNotFound();
  }

  const normalized = normalizePortfolioPayload({
    ...existing,
    ...payload,
    categoryCode: payload?.categoryCode ?? existing.categoryCode,
    isFeatured: payload?.isFeatured ?? existing.isFeatured
  });
  const errors = await validatePortfolioPayload(db, normalized);
  if (errors.length) {
    return validationResponse(errors);
  }

  await db
    .prepare(
      `UPDATE portfolio_items
       SET title = ?, description = ?, category_code = ?, status = ?, sort_order = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(
      normalized.title,
      normalized.description,
      normalized.categoryCode,
      normalized.status,
      normalized.sortOrder,
      normalized.isFeatured,
      normalizedItemId
    )
    .run();

  if (Array.isArray(payload?.images) || Array.isArray(payload?.imageUrls)) {
    await replacePortfolioImages(db, normalizedItemId, normalized.images);
  }

  return getPortfolioItem({ db, env, itemId: normalizedItemId, publicOnly: false });
}

export async function addPortfolioImages({ db, env = {}, itemId, payload }) {
  assertDb(db);
  await ensurePortfolioSchema(db, env);

  const normalizedItemId = normalizePositiveInteger(itemId);
  if (!normalizedItemId) {
    return itemIdError();
  }

  const existing = await selectPortfolioItem(db, normalizedItemId);
  if (!existing) {
    return itemNotFound();
  }

  const images = normalizeImagePayloads(payload?.images || payload?.imageUrls || []);
  const errors = validateImages(images);
  if (errors.length) {
    return validationResponse(errors);
  }

  const current = await listPortfolioImages(db, normalizedItemId);
  const next = current.concat(images.map((image, index) => ({
    ...image,
    sortOrder: image.sortOrder || (current.length + index + 1) * 10
  })));

  await replacePortfolioImages(db, normalizedItemId, next);
  return getPortfolioItem({ db, env, itemId: normalizedItemId, publicOnly: false });
}

export async function uploadPortfolioImage({ db, env = {}, itemId, file, payload = {} }) {
  assertDb(db);
  await ensurePortfolioSchema(db, env);

  const normalizedItemId = normalizePositiveInteger(itemId);
  if (!normalizedItemId) {
    return itemIdError();
  }

  const existing = await selectPortfolioItem(db, normalizedItemId);
  if (!existing) {
    return itemNotFound();
  }

  const bucket = env.PORTFOLIO_MEDIA_BUCKET;
  if (!bucket || typeof bucket.put !== "function") {
    return {
      ok: false,
      status: 503,
      body: {
        success: false,
        error: "portfolio_media_not_configured",
        message: "PORTFOLIO_MEDIA_BUCKET is not configured."
      }
    };
  }

  const upload = await normalizeUploadFile(file);
  if (!upload.ok) {
    return validationResponse([upload.error]);
  }

  const current = await listPortfolioImages(db, normalizedItemId);
  const sortOrder = normalizeInteger(payload.sortOrder, (current.length + 1) * 10);
  const requestedCover = payload.isCover === true || payload.isCover === "true" || payload.isCover === 1 || payload.isCover === "1";
  const storageKey = createPortfolioStorageKey(normalizedItemId, upload.extension);
  const imageUrl = buildPortfolioMediaUrl(env, storageKey);
  const image = {
    imageUrl,
    altText: cleanText(payload.altText || upload.name),
    sortOrder,
    isCover: requestedCover || current.length === 0 ? 1 : 0,
    storageKey,
    mimeType: upload.type,
    sizeBytes: upload.size
  };

  await bucket.put(storageKey, upload.buffer, {
    httpMetadata: {
      contentType: upload.type,
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: {
      portfolioItemId: String(normalizedItemId)
    }
  });

  const next = current.concat(image);
  await replacePortfolioImages(db, normalizedItemId, next);
  return getPortfolioItem({ db, env, itemId: normalizedItemId, publicOnly: false });
}

export async function publishPortfolioItem({ db, env = {}, itemId, published = true }) {
  assertDb(db);
  await ensurePortfolioSchema(db, env);

  const normalizedItemId = normalizePositiveInteger(itemId);
  if (!normalizedItemId) {
    return itemIdError();
  }

  const existing = await selectPortfolioItem(db, normalizedItemId);
  if (!existing) {
    return itemNotFound();
  }

  const images = await listPortfolioImages(db, normalizedItemId);
  if (published && !images.length) {
    return validationResponse([{ field: "images", message: "At least one image is required before publishing." }]);
  }

  await db
    .prepare("UPDATE portfolio_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(published ? "published" : "draft", normalizedItemId)
    .run();

  return getPortfolioItem({ db, env, itemId: normalizedItemId, publicOnly: false });
}

async function ensurePortfolioSchema(db, env) {
  if (env.RUNTIME_SCHEMA_INIT !== true && env.RUNTIME_SCHEMA_INIT !== "true") {
    return;
  }

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS portfolio_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS portfolio_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_code) REFERENCES portfolio_categories(code)
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS portfolio_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_item_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      alt_text TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_cover INTEGER NOT NULL DEFAULT 0,
      storage_key TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (portfolio_item_id) REFERENCES portfolio_items(id) ON DELETE CASCADE
    )`
  ).run();

  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_categories_code ON portfolio_categories(code)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_portfolio_items_status_category ON portfolio_items(status, category_code)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_portfolio_images_item ON portfolio_images(portfolio_item_id, sort_order)").run();

  await seedPortfolioCategories(db);
}

async function seedPortfolioCategories(db) {
  for (const category of DEFAULT_PORTFOLIO_CATEGORIES) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO portfolio_categories (
          code, name, sort_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(category.code, category.name, category.sortOrder)
      .run();
  }
}

async function listPortfolioCategories(db) {
  const result = await db
    .prepare(
      `SELECT
        code,
        name,
        sort_order AS sortOrder,
        is_active AS isActive
       FROM portfolio_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, name ASC`
    )
    .all();

  return (result?.results || []).map((item) => ({
    ...item,
    isActive: Boolean(item.isActive)
  }));
}

async function selectPortfolioItem(db, itemId) {
  return db
    .prepare(
      `SELECT
        portfolio_items.id,
        portfolio_items.title,
        portfolio_items.description,
        portfolio_items.category_code AS categoryCode,
        portfolio_categories.name AS categoryName,
        portfolio_items.status,
        portfolio_items.sort_order AS sortOrder,
        portfolio_items.is_featured AS isFeatured,
        portfolio_items.created_at AS createdAt,
        portfolio_items.updated_at AS updatedAt
       FROM portfolio_items
       LEFT JOIN portfolio_categories
         ON portfolio_categories.code = portfolio_items.category_code
       WHERE portfolio_items.id = ?`
    )
    .bind(itemId)
    .first();
}

async function listPortfolioImages(db, itemId) {
  const result = await db
    .prepare(
      `SELECT
        id,
        portfolio_item_id AS portfolioItemId,
        image_url AS imageUrl,
        alt_text AS altText,
        sort_order AS sortOrder,
        is_cover AS isCover,
        storage_key AS storageKey,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM portfolio_images
       WHERE portfolio_item_id = ?
       ORDER BY is_cover DESC, sort_order ASC, id ASC`
    )
    .bind(itemId)
    .all();

  return (result?.results || []).map((image) => ({
    ...image,
    isCover: Boolean(image.isCover)
  }));
}

async function replacePortfolioImages(db, itemId, images) {
  await db.prepare("DELETE FROM portfolio_images WHERE portfolio_item_id = ?").bind(itemId).run();

  for (const [index, image] of images.entries()) {
    await db
      .prepare(
        `INSERT INTO portfolio_images (
          portfolio_item_id, image_url, alt_text, sort_order, is_cover, storage_key, mime_type, size_bytes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        itemId,
        image.imageUrl,
        image.altText,
        image.sortOrder || (index + 1) * 10,
        image.isCover || index === 0 ? 1 : 0,
        image.storageKey || null,
        image.mimeType || null,
        image.sizeBytes || null
      )
      .run();
  }
}

async function validatePortfolioPayload(db, payload) {
  const errors = [];

  if (!payload.title) {
    errors.push({ field: "title", message: "title is required." });
  }

  if (!PORTFOLIO_STATUSES.has(payload.status)) {
    errors.push({ field: "status", message: "status must be draft or published." });
  }

  const category = await db
    .prepare("SELECT code FROM portfolio_categories WHERE code = ? AND is_active = 1")
    .bind(payload.categoryCode)
    .first();
  if (!category) {
    errors.push({ field: "categoryCode", message: "categoryCode is unknown." });
  }

  errors.push(...validateImages(payload.images));
  if (payload.status === "published" && !payload.images.length) {
    errors.push({ field: "images", message: "At least one image is required before publishing." });
  }

  return errors;
}

function validateImages(images) {
  const errors = [];
  for (const [index, image] of images.entries()) {
    if (!image.imageUrl || !isHttpUrl(image.imageUrl)) {
      errors.push({ field: `images.${index}.imageUrl`, message: "imageUrl must be an http or https URL." });
    }
  }
  return errors;
}

function normalizeImagePayloads(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/\s+/).filter(Boolean);
  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          imageUrl: cleanText(item),
          altText: "",
          sortOrder: (index + 1) * 10,
          isCover: index === 0 ? 1 : 0
        };
      }

      return {
        imageUrl: cleanText(item?.imageUrl || item?.url),
        altText: cleanText(item?.altText),
        sortOrder: normalizeInteger(item?.sortOrder, (index + 1) * 10),
        isCover: item?.isCover === true || item?.isCover === 1 ? 1 : 0,
        storageKey: cleanText(item?.storageKey),
        mimeType: cleanText(item?.mimeType),
        sizeBytes: normalizeOptionalInteger(item?.sizeBytes)
      };
    })
    .filter((item) => item.imageUrl);
}

async function normalizeUploadFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    return {
      ok: false,
      error: { field: "file", message: "file is required." }
    };
  }

  const type = cleanText(file.type).toLowerCase();
  const extension = PORTFOLIO_IMAGE_TYPES.get(type);
  if (!extension) {
    return {
      ok: false,
      error: { field: "file", message: "file must be JPEG, PNG, or WebP." }
    };
  }

  const size = Number(file.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return {
      ok: false,
      error: { field: "file", message: "file must not be empty." }
    };
  }

  if (size > MAX_PORTFOLIO_IMAGE_BYTES) {
    return {
      ok: false,
      error: { field: "file", message: "file must be 5 MB or smaller." }
    };
  }

  return {
    ok: true,
    name: cleanText(file.name),
    type,
    extension,
    size,
    buffer: await file.arrayBuffer()
  };
}

function createPortfolioStorageKey(itemId, extension) {
  const randomId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `portfolio/${itemId}/${randomId}.${extension}`;
}

function buildPortfolioMediaUrl(env, storageKey) {
  const baseUrl = cleanText(env.PORTFOLIO_MEDIA_PUBLIC_BASE_URL);
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/g, "")}/${storageKey}`;
  }

  return `/media/${storageKey}`;
}

function itemIdError() {
  return validationResponse([{ field: "itemId", message: "itemId must be a positive integer." }]);
}

function itemNotFound() {
  return {
    ok: false,
    status: 404,
    body: {
      success: false,
      error: "portfolio_item_not_found",
      message: "Portfolio item was not found."
    }
  };
}

function validationResponse(fields) {
  return {
    ok: false,
    status: 400,
    body: {
      success: false,
      error: "validation_error",
      message: "Request validation failed.",
      fields
    }
  };
}

function assertDb(db) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function normalizeOptionalInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function cleanSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
