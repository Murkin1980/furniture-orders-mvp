import test from "node:test";
import assert from "node:assert/strict";
import { buildRecognitionRequest } from "../src/ocr/recognition-prompt.js";
import { buildOpenAiVisionRequest, sendOpenAiVisionRequest } from "../src/ocr/openai-vision.js";

const neutralRequest = buildRecognitionRequest({
  context: { furnitureType: "wardrobe" },
  image: { source: "https://media.example.test/sketch.webp", mimeType: "image/webp" }
});
const env = { OPENAI_API_KEY: "secret", OCR_MODEL: "gpt-4o-mini" };

test("builds an OpenAI-compatible multimodal OCR request", () => {
  const request = buildOpenAiVisionRequest(neutralRequest, { env });
  assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(request.headers.Authorization, "Bearer secret");
  assert.equal(request.body.model, "gpt-4o-mini");
  assert.equal(request.body.messages[1].content[1].type, "image_url");
  assert.equal(request.body.messages[1].content[1].image_url.url, "https://media.example.test/sketch.webp");
  assert.equal(request.body.response_format.type, "json_object");
});

test("supports data image URLs but rejects internal and insecure sources", () => {
  const dataRequest = { ...neutralRequest, image: { ...neutralRequest.image, source: "data:image/png;base64,AAAA" } };
  assert.doesNotThrow(() => buildOpenAiVisionRequest(dataRequest, { env }));
  for (const source of ["r2://orders/sketch.webp", "http://example.test/sketch.webp", "/media/sketch.webp"]) {
    assert.throws(
      () => buildOpenAiVisionRequest({ ...neutralRequest, image: { ...neutralRequest.image, source } }, { env }),
      /HTTPS URL or data URL/
    );
  }
});

test("sender uses injected fetch and returns compatible content", async () => {
  let call;
  const response = await sendOpenAiVisionRequest(neutralRequest, {
    env,
    fetchFn: async (url, options) => {
      call = { url, options };
      return jsonResponse(200, { choices: [{ message: { content: '{"documentType":"furniture_sketch"}' } }] });
    }
  });
  assert.match(response.content, /furniture_sketch/);
  assert.equal(call.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(JSON.parse(call.options.body).messages[1].content[1].type, "image_url");
});

test("sender stops on 429 and does not retry", async () => {
  let calls = 0;
  await assert.rejects(sendOpenAiVisionRequest(neutralRequest, {
    env,
    fetchFn: async () => { calls += 1; return jsonResponse(429, {}); }
  }), /rate limit exceeded/i);
  assert.equal(calls, 1);
});

test("missing API key fails before fetch", async () => {
  let calls = 0;
  await assert.rejects(sendOpenAiVisionRequest(neutralRequest, {
    env: {},
    fetchFn: async () => { calls += 1; }
  }), /API key is missing/i);
  assert.equal(calls, 0);
});

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
