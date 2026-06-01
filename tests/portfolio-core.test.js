import test from "node:test";
import assert from "node:assert/strict";
import {
  createPortfolioItem,
  listPortfolio,
  normalizePortfolioPayload,
  publishPortfolioItem,
  uploadPortfolioImage
} from "../src/portfolio-core.js";

test("normalizes portfolio payload with image URLs", () => {
  const payload = normalizePortfolioPayload({
    title: " Kitchen project ",
    categoryCode: "Kitchens",
    imageUrls: "https://example.com/a.jpg\nhttps://example.com/b.jpg",
    isFeatured: true
  });

  assert.equal(payload.title, "Kitchen project");
  assert.equal(payload.categoryCode, "kitchens");
  assert.equal(payload.images.length, 2);
  assert.equal(payload.images[0].isCover, 1);
  assert.equal(payload.isFeatured, 1);
});

test("creates draft portfolio item with images and categories", async () => {
  const db = createPortfolioMockDb();
  const result = await createPortfolioItem({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      title: "Modern kitchen",
      categoryCode: "kitchens",
      description: "Matte fronts and stone countertop.",
      imageUrls: "https://example.com/kitchen.jpg"
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.item.status, "draft");
  assert.equal(result.body.item.images.length, 1);
  assert.equal(result.body.item.categoryName, "Kitchens");
});

test("published portfolio is visible publicly and filtered by category", async () => {
  const db = createPortfolioMockDb();
  const env = { RUNTIME_SCHEMA_INIT: "true" };
  const kitchen = await createPortfolioItem({
    db,
    env,
    payload: {
      title: "Kitchen",
      categoryCode: "kitchens",
      imageUrls: "https://example.com/kitchen.jpg"
    }
  });
  await createPortfolioItem({
    db,
    env,
    payload: {
      title: "Wardrobe",
      categoryCode: "wardrobes",
      imageUrls: "https://example.com/wardrobe.jpg"
    }
  });
  await publishPortfolioItem({
    db,
    env,
    itemId: kitchen.body.item.id,
    published: true
  });

  const publicList = await listPortfolio({
    db,
    env,
    publicOnly: true
  });
  const filtered = await listPortfolio({
    db,
    env,
    publicOnly: true,
    categoryCode: "kitchens"
  });

  assert.equal(publicList.body.items.length, 1);
  assert.equal(publicList.body.items[0].title, "Kitchen");
  assert.equal(filtered.body.items.length, 1);
  assert.equal(filtered.body.items[0].categoryCode, "kitchens");
});

test("publishing requires at least one image", async () => {
  const db = createPortfolioMockDb();
  const env = { RUNTIME_SCHEMA_INIT: "true" };
  const item = await createPortfolioItem({
    db,
    env,
    payload: {
      title: "No photo work",
      categoryCode: "other"
    }
  });
  const published = await publishPortfolioItem({
    db,
    env,
    itemId: item.body.item.id,
    published: true
  });

  assert.equal(published.status, 400);
  assert.equal(published.body.error, "validation_error");
});

test("uploads portfolio image to configured storage bucket", async () => {
  const db = createPortfolioMockDb();
  const bucket = createBucketMock();
  const env = {
    RUNTIME_SCHEMA_INIT: "true",
    PORTFOLIO_MEDIA_BUCKET: bucket,
    PORTFOLIO_MEDIA_PUBLIC_BASE_URL: "https://media.example.test/assets"
  };
  const item = await createPortfolioItem({
    db,
    env,
    payload: {
      title: "Uploaded kitchen",
      categoryCode: "kitchens"
    }
  });
  const uploaded = await uploadPortfolioImage({
    db,
    env,
    itemId: item.body.item.id,
    file: createImageFile("kitchen.webp", "image/webp", 1024),
    payload: {
      altText: "Kitchen photo"
    }
  });

  assert.equal(uploaded.status, 200);
  assert.equal(bucket.objects.length, 1);
  assert.match(bucket.objects[0].key, /^portfolio\/1\/.+\.webp$/);
  assert.equal(bucket.objects[0].options.httpMetadata.contentType, "image/webp");
  assert.equal(uploaded.body.item.images.length, 1);
  assert.equal(uploaded.body.item.images[0].storageKey, bucket.objects[0].key);
  assert.equal(uploaded.body.item.images[0].mimeType, "image/webp");
  assert.equal(uploaded.body.item.images[0].sizeBytes, 1024);
  assert.equal(uploaded.body.item.images[0].imageUrl, `https://media.example.test/assets/${bucket.objects[0].key}`);
});

test("upload requires configured storage bucket and supported image type", async () => {
  const db = createPortfolioMockDb();
  const env = { RUNTIME_SCHEMA_INIT: "true" };
  const item = await createPortfolioItem({
    db,
    env,
    payload: {
      title: "Storage missing",
      categoryCode: "other"
    }
  });
  const missingBucket = await uploadPortfolioImage({
    db,
    env,
    itemId: item.body.item.id,
    file: createImageFile("photo.jpg", "image/jpeg", 128)
  });
  const unsupported = await uploadPortfolioImage({
    db,
    env: { ...env, PORTFOLIO_MEDIA_BUCKET: createBucketMock() },
    itemId: item.body.item.id,
    file: createImageFile("photo.txt", "text/plain", 128)
  });

  assert.equal(missingBucket.status, 503);
  assert.equal(missingBucket.body.error, "portfolio_media_not_configured");
  assert.equal(unsupported.status, 400);
  assert.equal(unsupported.body.fields[0].field, "file");
});

function createPortfolioMockDb() {
  const state = {
    portfolioCategories: [],
    portfolioItems: [],
    portfolioImages: []
  };

  state.prepare = (sql) => {
    const statement = createStatement(state, sql, []);
    return {
      bind: (...values) => createStatement(state, sql, values),
      run: statement.run,
      first: statement.first,
      all: statement.all
    };
  };

  return state;
}

function createStatement(state, sql, values) {
  return {
    run: async () => {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("CREATE UNIQUE INDEX")) {
        return { success: true };
      }

      if (sql.includes("INSERT OR IGNORE INTO portfolio_categories")) {
        const [code, name, sortOrder] = values;
        if (!state.portfolioCategories.some((item) => item.code === code)) {
          state.portfolioCategories.push({
            id: state.portfolioCategories.length + 1,
            code,
            name,
            sortOrder,
            isActive: 1,
            createdAt: now(),
            updatedAt: now()
          });
        }
        return { success: true };
      }

      if (sql.includes("INSERT INTO portfolio_items")) {
        const [title, description, categoryCode, status, sortOrder, isFeatured] = values;
        const id = state.portfolioItems.length + 1;
        state.portfolioItems.push({
          id,
          title,
          description,
          categoryCode,
          status,
          sortOrder,
          isFeatured,
          createdAt: now(),
          updatedAt: now()
        });
        return { success: true, meta: { last_row_id: id } };
      }

      if (sql.includes("DELETE FROM portfolio_images")) {
        const [itemId] = values;
        state.portfolioImages = state.portfolioImages.filter((item) => item.portfolioItemId !== itemId);
        return { success: true };
      }

      if (sql.includes("INSERT INTO portfolio_images")) {
        const [portfolioItemId, imageUrl, altText, sortOrder, isCover, storageKey, mimeType, sizeBytes] = values;
        const id = state.portfolioImages.length + 1;
        state.portfolioImages.push({
          id,
          portfolioItemId,
          imageUrl,
          altText,
          sortOrder,
          isCover,
          storageKey,
          mimeType,
          sizeBytes,
          createdAt: now(),
          updatedAt: now()
        });
        return { success: true, meta: { last_row_id: id } };
      }

      if (sql.includes("UPDATE portfolio_items") && sql.includes("SET status = ?")) {
        const [status, itemId] = values;
        const item = state.portfolioItems.find((entry) => entry.id === itemId);
        if (item) {
          item.status = status;
          item.updatedAt = now();
        }
        return { success: true };
      }

      if (sql.includes("UPDATE portfolio_items")) {
        const [title, description, categoryCode, status, sortOrder, isFeatured, itemId] = values;
        const item = state.portfolioItems.find((entry) => entry.id === itemId);
        if (item) {
          Object.assign(item, { title, description, categoryCode, status, sortOrder, isFeatured, updatedAt: now() });
        }
        return { success: true };
      }

      throw new Error(`Unexpected run SQL: ${sql}`);
    },
    first: async () => {
      if (sql.includes("SELECT code FROM portfolio_categories")) {
        const [code] = values;
        const category = state.portfolioCategories.find((item) => item.code === code && item.isActive === 1);
        return category ? { code: category.code } : null;
      }

      if (sql.includes("FROM portfolio_items") && sql.includes("WHERE portfolio_items.id = ?")) {
        const [itemId] = values;
        const item = state.portfolioItems.find((entry) => entry.id === itemId);
        return item ? toPortfolioRow(state, item) : null;
      }

      throw new Error(`Unexpected first SQL: ${sql}`);
    },
    all: async () => {
      if (sql.includes("FROM portfolio_categories")) {
        return {
          results: state.portfolioCategories
            .filter((item) => item.isActive === 1)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({ ...item }))
        };
      }

      if (sql.includes("FROM portfolio_images")) {
        const [itemId] = values;
        return {
          results: state.portfolioImages
            .filter((item) => item.portfolioItemId === itemId)
            .sort((a, b) => b.isCover - a.isCover || a.sortOrder - b.sortOrder)
            .map((item) => ({ ...item }))
        };
      }

      if (sql.includes("FROM portfolio_items")) {
        const publicOnly = values.includes("published");
        const category = values.find((value) => value !== "published");
        return {
          results: state.portfolioItems
            .filter((item) => !publicOnly || item.status === "published")
            .filter((item) => !category || item.categoryCode === category)
            .sort((a, b) => b.isFeatured - a.isFeatured || a.sortOrder - b.sortOrder || b.id - a.id)
            .map((item) => toPortfolioRow(state, item))
        };
      }

      throw new Error(`Unexpected all SQL: ${sql}`);
    }
  };
}

function toPortfolioRow(state, item) {
  const category = state.portfolioCategories.find((entry) => entry.code === item.categoryCode);
  return {
    ...item,
    categoryName: category?.name || null
  };
}

function now() {
  return "2026-05-31 12:00:00";
}

function createBucketMock() {
  return {
    objects: [],
    async put(key, value, options) {
      this.objects.push({ key, value, options });
    }
  };
}

function createImageFile(name, type, size) {
  const file = new Blob([new Uint8Array(size)], { type });
  Object.defineProperties(file, {
    name: { value: name }
  });
  return file;
}
