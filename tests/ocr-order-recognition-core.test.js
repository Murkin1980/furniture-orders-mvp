import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteOrderRecognitionCore,
  listOrderRecognitionsCore,
  recognizeOrderImageCore,
  reviewOrderRecognitionCore
} from "../src/ocr/order-recognition-core.js";
import { onRequestPost } from "../functions/api/orders/[id]/ocr/recognize.js";
import { onRequestDelete, onRequestGet, onRequestPatch } from "../functions/api/orders/[id]/ocr/recognitions.js";

const validResult = {
  documentType: "furniture_sketch", furnitureType: "wardrobe", rawText: "2400 x 1800",
  dimensions: [], components: ["doors"], materials: [], notes: [], warnings: [],
  missingInfo: ["depth"], confidence: 0.8
};
const input = {
  image: {
    source: "r2://orders/sketch.webp",
    mediaId: "media-1",
    mimeType: "image/webp",
    synthetic: true
  }
};

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
  assert.equal(db.records[0].imageSource, "r2://orders/sketch.webp");
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

test("endpoint stays disabled without injected sender or explicit env flag", async () => {
  const response = await onRequestPost({
    request: request(input, "secret"), env: { ADMIN_WRITE_TOKEN: "secret", DB: createDb(order()) },
    params: { id: "1" }, data: {}
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "ocr_recognition_disabled");
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

test("endpoint blocks customer images before calling the sender", async () => {
  let senderCalls = 0;
  const response = await onRequestPost({
    request: request({
      image: { source: "https://media.example.test/customer-sketch.webp", mediaId: "orders/customer-sketch.webp" },
      consent: durableConsent()
    }, "secret"),
    env: { ADMIN_WRITE_TOKEN: "secret", DB: createDb(order()) },
    params: { id: "1" },
    data: { sendRecognitionRequest: async () => { senderCalls += 1; } }
  });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "ocr_customer_images_disabled");
  assert.equal(senderCalls, 0);
});

test("endpoint allows an explicitly enabled and consented stored customer image", async () => {
  const db = createDb(order());
  const response = await onRequestPost({
    request: request({
      image: { source: "https://media.example.test/customer-sketch.webp", mediaId: "orders/customer-sketch.webp" },
      consent: durableConsent()
    }, "secret"),
    env: {
      ADMIN_WRITE_TOKEN: "secret",
      OCR_CUSTOMER_IMAGES_ENABLED: "true",
      DB: db
    },
    params: { id: "1" },
    data: { sendRecognitionRequest: async () => JSON.stringify(validResult) }
  });

  assert.equal(response.status, 201);
  assert.equal(db.records[0].status, "draft");
  assert.equal(db.records[0].consentStatus, "confirmed");
  assert.equal(db.records[0].consentPolicyVersion, "ocr-consent-v1");
});

test("lists recognition records for an order", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  const response = await listOrderRecognitionsCore({ db }, 1);
  assert.equal(response.status, 200);
  assert.equal(response.body.items[0].imageSource, "r2://orders/sketch.webp");
  assert.equal(response.body.items[0].result.rawText, "2400 x 1800");
});

test("manager explicitly approves an edited recognition result", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  const edited = { ...validResult, rawText: "checked by manager" };
  const response = await reviewOrderRecognitionCore({ db }, 1, {
    recognitionId: 1, status: "approved", result: edited,
    reviewedBy: "manager", reviewedAt: "2026-06-14T18:00:00Z"
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.item.status, "approved");
  assert.equal(response.body.item.result.rawText, "checked by manager");
});

test("review rejects draft status and mismatched recognition", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  assert.equal((await reviewOrderRecognitionCore({ db }, 1, { recognitionId: 1, status: "draft", result: validResult })).status, 400);
  assert.equal((await reviewOrderRecognitionCore({ db }, 2, { recognitionId: 1, status: "approved", result: validResult })).status, 404);
});

test("list endpoint allows read token and review endpoint requires write token", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  const listResponse = await onRequestGet({
    request: requestFor("GET", undefined, "read"), env: { ADMIN_READ_TOKEN: "read", DB: db }, params: { id: "1" }
  });
  const rejectedReview = await onRequestPatch({
    request: requestFor("PATCH", { recognitionId: 1, status: "approved", result: validResult }, "read"),
    env: { ADMIN_READ_TOKEN: "read", DB: db }, params: { id: "1" }
  });
  assert.equal(listResponse.status, 200);
  assert.equal(rejectedReview.status, 401);
});

test("manual deletion removes stored image before redacting recognition data", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  const deleted = [];
  const response = await deleteOrderRecognitionCore({
    db,
    deleteStoredImage: async (image) => deleted.push(image)
  }, 1, {
    recognitionId: 1,
    managerConfirmed: true,
    deletedBy: "manager-1",
    reason: "retention expired"
  }, { now: "2026-06-15T12:00:00Z" });

  assert.equal(response.status, 200);
  assert.deepEqual(deleted, [{ mediaId: "media-1", imageSource: "r2://orders/sketch.webp" }]);
  assert.equal(db.records[0].status, "deleted");
  assert.equal(db.records[0].imageSource, null);
  assert.equal(db.records[0].deletionReason, "retention expired");
});

test("deletion fails closed without manager confirmation or storage deleter", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  assert.equal((await deleteOrderRecognitionCore({ db }, 1, {
    recognitionId: 1, deletedBy: "manager", reason: "requested"
  })).body.error, "ocr_deletion_confirmation_required");
  assert.equal((await deleteOrderRecognitionCore({ db }, 1, {
    recognitionId: 1, managerConfirmed: true, deletedBy: "manager", reason: "requested"
  })).body.error, "ocr_storage_deletion_unavailable");
  assert.equal(db.records[0].status, "draft");
});

test("storage deletion failure leaves recognition data intact", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  await assert.rejects(() => deleteOrderRecognitionCore({
    db,
    deleteStoredImage: async () => { throw new Error("R2 unavailable"); }
  }, 1, {
    recognitionId: 1, managerConfirmed: true, deletedBy: "manager", reason: "requested"
  }), /R2 unavailable/);
  assert.equal(db.records[0].status, "draft");
  assert.equal(db.records[0].imageSource, "r2://orders/sketch.webp");
});

test("DELETE endpoint requires write auth and supports injected storage deletion", async () => {
  const db = createDb(order());
  await recognizeOrderImageCore({ db }, 1, input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  const body = { recognitionId: 1, managerConfirmed: true, deletedBy: "manager", reason: "requested" };
  const rejected = await onRequestDelete({
    request: requestFor("DELETE", body, "read"),
    env: { ADMIN_READ_TOKEN: "read", DB: db },
    params: { id: "1" },
    data: {}
  });
  const accepted = await onRequestDelete({
    request: requestFor("DELETE", body, "write"),
    env: { ADMIN_WRITE_TOKEN: "write", DB: db },
    params: { id: "1" },
    data: { deleteStoredImage: async () => {}, now: "2026-06-15T12:00:00Z" }
  });
  assert.equal(rejected.status, 401);
  assert.equal(accepted.status, 200);
});

function request(body, token = "") {
  return new Request("https://example.test/api/orders/1/ocr/recognize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
}
function requestFor(method, body, token = "") {
  return new Request("https://example.test/api/orders/1/ocr/recognitions", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
function order() { return { id: 1, source: "site", city: "Almaty", furnitureType: "wardrobe", description: "Wardrobe" }; }
function durableConsent() {
  return {
    confirmed: true, managerConfirmed: true, policyVersion: "ocr-consent-v1",
    confirmedBy: "manager", confirmedAt: "2026-06-15T10:00:00Z",
    retentionUntil: "2027-06-15T10:00:00Z"
  };
}
function createDb(existingOrder) {
  const records = [];
  return {
    records,
    prepare(sql) {
      let values = [];
      return {
        bind(...inputValues) { values = inputValues; return this; },
        async first() {
          if (sql.includes("FROM orders")) return existingOrder && values[0] === existingOrder.id ? { ...existingOrder } : null;
          if (sql.includes("FROM ocr_recognitions") && sql.includes("order_id = ?")) {
            return records.find((record) => record.id === values[0] && record.orderId === values[1]) || null;
          }
          if (sql.includes("FROM ocr_recognitions")) return records.find((record) => record.id === values[0]) || null;
          return null;
        },
        async all() { return { results: records.filter((record) => record.orderId === values[0]).reverse() }; },
        async run() {
          if (sql.includes("INSERT INTO ocr_recognitions")) {
            records.push({
              id: records.length + 1, orderId: values[0], mediaId: values[1], imageSource: values[2],
              status: values[3], resultJson: values[4], provider: values[5], model: values[6],
              processingTimeMs: values[7], error: values[8], createdBy: values[9],
              consentStatus: values[10], consentPolicyVersion: values[11],
              consentConfirmedBy: values[12], consentConfirmedAt: values[13],
              retentionUntil: values[14],
              createdAt: "2026-06-14", updatedAt: "2026-06-14"
            });
            return { meta: { last_row_id: records.length } };
          }
          if (sql.includes("UPDATE ocr_recognitions")) {
            if (sql.includes("status = 'deleted'")) {
              const record = records.find((item) => item.id === values[4] && item.orderId === values[5]);
              Object.assign(record, {
                status: "deleted", resultJson: values[0], imageSource: null,
                deletedBy: values[1], deletedAt: values[2], deletionReason: values[3],
                updatedAt: "2026-06-15"
              });
              return { success: true };
            }
            const record = records.find((item) => item.id === values[4] && item.orderId === values[5]);
            Object.assign(record, {
              status: values[0], resultJson: values[1], reviewedBy: values[2],
              reviewedAt: values[3], updatedAt: "2026-06-14"
            });
          }
          return { success: true };
        }
      };
    }
  };
}
