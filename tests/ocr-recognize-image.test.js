import test from "node:test";
import assert from "node:assert/strict";
import { recognizeImage } from "../src/ocr/recognize-image.js";
import { getDefaultRecognitionResult } from "../src/ocr/recognition-result.js";

const validResult = {
  documentType: "furniture_sketch",
  furnitureType: "kitchen",
  rawText: "Width 3200 mm",
  dimensions: [{ label: "overall_width", value: 3200, unit: "mm", confidence: 0.9, sourceText: "3200" }],
  components: ["base cabinets"],
  materials: [],
  notes: [],
  warnings: [],
  missingInfo: ["height"],
  confidence: 0.8
};

function clock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test("recognizes an image with an injected fake sender", async () => {
  const result = await recognizeImage(
    { image: { source: "media:test" }, context: { furnitureType: "kitchen" } },
    { sendRecognitionRequest: async () => JSON.stringify(validResult), now: clock(10, 24) }
  );

  assert.equal(result.furnitureType, "kitchen");
  assert.deepEqual(result.meta, { processingTimeMs: 14, requestBuilt: true, parseFailed: false });
});

test("passes a provider-neutral request to the sender", async () => {
  let received;
  await recognizeImage(
    { image: { source: "r2://media/sketch.png", mimeType: "image/png" }, context: { orderId: 7 } },
    {
      sendRecognitionRequest: async (request) => {
        received = request;
        return JSON.stringify(validResult);
      }
    }
  );

  assert.equal(received.image.source, "r2://media/sketch.png");
  assert.match(received.prompt, /orderId: 7/);
  assert.equal(received.responseFormat.type, "json_object");
});

test("returns default and meta error without sender", async () => {
  const result = await recognizeImage({ image: { source: "media:test" } });
  assert.deepEqual({ ...result, meta: undefined }, { ...getDefaultRecognitionResult(), meta: undefined });
  assert.equal(result.meta.error, "sendRecognitionRequest must be provided.");
  assert.equal(result.meta.requestBuilt, true);
});

test("returns default and meta error when sender throws", async () => {
  const result = await recognizeImage(
    { image: { source: "media:test" } },
    { sendRecognitionRequest: async () => { throw new Error("Vision unavailable"); } }
  );
  assert.equal(result.meta.error, "Vision unavailable");
  assert.equal(result.meta.requestBuilt, true);
});

test("returns default error before sender when image source is missing", async () => {
  let calls = 0;
  const result = await recognizeImage({}, {
    sendRecognitionRequest: async () => { calls += 1; return JSON.stringify(validResult); }
  });
  assert.equal(calls, 0);
  assert.equal(result.meta.requestBuilt, false);
  assert.equal(result.meta.error, "OCR image source must be a non-empty string.");
});

test("marks invalid JSON as parse failure", async () => {
  const result = await recognizeImage(
    { image: { source: "media:test" } },
    { sendRecognitionRequest: async () => "{invalid" }
  );
  assert.deepEqual({ ...result, meta: undefined }, { ...getDefaultRecognitionResult(), meta: undefined });
  assert.equal(result.meta.parseFailed, true);
});

test("supports content and OpenAI-like choices responses", async () => {
  const contentResult = await recognizeImage(
    { image: { source: "media:test" } },
    { sendRecognitionRequest: async () => ({ content: JSON.stringify(validResult) }) }
  );
  const choicesResult = await recognizeImage(
    { image: { source: "media:test" } },
    { sendRecognitionRequest: async () => ({ choices: [{ message: { content: JSON.stringify(validResult) } }] }) }
  );
  assert.equal(contentResult.confidence, 0.8);
  assert.equal(choicesResult.dimensions[0].value, 3200);
});

test("accepts an explicit valid empty draft without parse failure", async () => {
  const result = await recognizeImage(
    { image: { source: "media:test" } },
    { sendRecognitionRequest: async () => JSON.stringify(getDefaultRecognitionResult()) }
  );
  assert.equal(result.meta.parseFailed, false);
});

test("does not call fetch", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { fetchCalls += 1; };
  try {
    await recognizeImage(
      { image: { source: "media:test" } },
      { sendRecognitionRequest: async () => JSON.stringify(validResult) }
    );
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not mutate input", async () => {
  const input = { image: { source: "media:test" }, context: { orderId: 1 } };
  const snapshot = structuredClone(input);
  await recognizeImage(input, { sendRecognitionRequest: async () => JSON.stringify(validResult) });
  assert.deepEqual(input, snapshot);
});
