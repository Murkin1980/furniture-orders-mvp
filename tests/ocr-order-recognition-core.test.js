import test from "node:test";
import assert from "node:assert/strict";
import { recognizeOrderImageCore } from "../src/ocr/order-recognition-core.js";
import { onRequestPost } from "../functions/api/orders/[id]/ocr/recognize.js";

const validResult = {
  documentType: "furniture_sketch", furnitureType: "wardrobe", rawText: "2400 x 1800",
  dimensions: [], components: ["doors"], materials: [], notes: [], warnings: [],
  missingInfo: ["depth"], confidence: 0.8
};
const input = { image: { source: "r2://orders/sketch.webp", mediaId: "media-1", mimeType: "image/webp" } };

test("returns 404 when order is not found", async () => {
  const response = await recognizeOrderImageCore({ db: createDb(null) }, 99, input, {
    sendRecognitionRequest: async () => JSON.stringify(validResult)
  });
  assert.equal(response.status, 404);
});

test("requires a stored image source", async () => {
  const response = await recognizeOrderImageCore({ db: createDb(order()) }, 1, { image: {} });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "image_source_required");
});

test("successful recognition saves a draft linked to order and media", async () => {
  const db = createDb(order());
  const response = await recognizeOrderImageCore({ db }, 1, input, {
    sendRecognitionRequest: async () => JSON.stringify(validResult),
    provider: "fake-vision", model: "test-model"
  });
  assert.equal(response.status, 201);
  assert.equal(db.records[0].status, "draft");
  assert.equal(db.records[0].orderId, 1);
  assert.equal(db.records[0].mediaId, "media-1");
  assert.equal(response.body.item.result.furnitureType, "wardrobe");
});

test("invalid provider JSON saves a failed record", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => "{bad" });
  assert.equal(db.records[0].status, "failed");
  assert.match(db.records[0].error, /could not be parsed/);
});

test("sender error saves a failed record without throwing", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, {
    sendRecognitionRequest: async () => { throw new Error("Vision unavailable"); }
  });
  assert.equal(db.records[0].status, "failed");
  assert.equal(db.records[0].error, "Vision unavailable");
});

test("endpoint requires write authorization", async () => {
  const response = await onRequestPost({
    request: request(input), env: { ADMIN_WRITE_TOKEN: "secret", DB: createDb(order()) },
    params: { id: "1" }, data: {}
  });
  assert.equal(response.status, 401);
});

test("read token cannot trigger recognition", async () => {
  const response = await onRequestPost({
    request: request(input, "read"), env: { ADMIN_READ_TOKEN: "read", DB: createDb(order()) },
    params: { id: "1" }, data: {}
  });
  assert.equal(response.status, 401);
});

test("endpoint uses injected sender and does not call fetch", async () => {
  const db = createDb(order());
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { fetchCalls += 1; };
  try {
    const response = await onRequestPost({
      request: request(input, "secret"), env: { ADMIN_WRITE_TOKEN: "secret", DB: db },
      params: { id: "1" }, data: { sendRecognitionRequest: async () => JSON.stringify(validResult) }
    });
    assert.equal(response.status, 201);
    assert.equal(fetchCalls, 0);
    assert.equal(db.records[0].status, "draft");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function request(body, token = "") {
  return new Request("https://example.test/api/orders/1/ocr/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
}
function order() { return { id: 1, source: "site", city: "Almaty", furnitureType: "wardrobe", description: "Wardrobe" }; }
function createDb(existingOrder) {
  const records = [];
  return {
    records,
    prepare(sql) {
      let values = [];
      return {
        bind(...inputValues) { values = inputValues; return this; },
        async first() { return sql.includes("FROM orders") && existingOrder && values[0] === existingOrder.id ? { ...existingOrder } : null; },
        async run() {
          if (sql.includes("INSERT INTO ocr_recognitions")) {
            records.push({
              id: records.length + 1, orderId: values[0], mediaId: values[1], status: values[2],
              resultJson: values[3], provider: values[4], model: values[5],
              processingTimeMs: values[6], error: values[7], createdBy: values[8]
            });
            return { meta: { last_row_id: records.length } };
          }
          return { success: true };
        }
      };
    }
  };
}
