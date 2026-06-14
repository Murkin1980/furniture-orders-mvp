import test from "node:test";
import assert from "node:assert/strict";
import {
  OCR_REQUIRED_RESULT_FIELDS,
  buildRecognitionPrompt,
  buildRecognitionRequest
} from "../src/ocr/recognition-prompt.js";

test("prompt includes strict schema and furniture safety rules", () => {
  const prompt = buildRecognitionPrompt({});

  for (const field of OCR_REQUIRED_RESULT_FIELDS) assert.match(prompt, new RegExp(field));
  assert.match(prompt, /unit=unknown/);
  assert.match(prompt, /Do not infer values/);
  assert.match(prompt, /SketchUp action/);
});

test("prompt includes known context and supports snake case", () => {
  const prompt = buildRecognitionPrompt({
    orderId: 42,
    furniture_type: "wardrobe",
    document_type: "measurement_sheet",
    manager_note: "Check niche width",
    source_label: "Customer sketch"
  });

  for (const value of ["42", "wardrobe", "measurement_sheet", "Check niche width", "Customer sketch"]) {
    assert.match(prompt, new RegExp(value));
  }
});

test("prompt does not contain undefined or null", () => {
  const prompt = buildRecognitionPrompt({ orderId: null, managerNote: undefined });
  assert.doesNotMatch(prompt, /\bundefined\b|\bnull\b/i);
  assert.match(prompt, /Not provided/);
});

test("request contains provider-neutral image and response format", () => {
  const request = buildRecognitionRequest({
    context: { furnitureType: "kitchen" },
    image: {
      source: "r2://order-media/sketch.webp",
      mimeType: "image/webp",
      label: "Sketch 1",
      mediaId: 15
    }
  });

  assert.deepEqual(request.image, {
    source: "r2://order-media/sketch.webp",
    mimeType: "image/webp",
    label: "Sketch 1",
    mediaId: "15"
  });
  assert.equal(request.responseFormat.type, "json_object");
  assert.deepEqual(request.responseFormat.requiredFields, [...OCR_REQUIRED_RESULT_FIELDS]);
  assert.match(request.systemPrompt, /manager-review draft/);
});

test("request supports snake_case image metadata", () => {
  const request = buildRecognitionRequest({
    image: { source: "media:1", mime_type: "image/png", media_id: "1" }
  });

  assert.equal(request.image.mimeType, "image/png");
  assert.equal(request.image.mediaId, "1");
});

test("request rejects an empty image source", () => {
  assert.throws(
    () => buildRecognitionRequest({ image: { mimeType: "image/png" } }),
    { name: "TypeError", message: "OCR image source must be a non-empty string." }
  );
});

test("request builder does not call fetch", () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { calls += 1; };

  try {
    buildRecognitionRequest({ image: { source: "media:test" } });
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("request builder does not mutate input", () => {
  const input = {
    context: { furnitureType: "office" },
    image: { source: "media:test", mimeType: "image/jpeg" },
    options: { locale: "ru-KZ" }
  };
  const snapshot = structuredClone(input);
  buildRecognitionRequest(input);
  assert.deepEqual(input, snapshot);
});
