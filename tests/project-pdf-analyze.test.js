import test from "node:test";
import assert from "node:assert/strict";

import { analyzeProjectPdf } from "../src/pdf/analyze-project-pdf.js";

const pdfInput = {
  fileName: "designer.pdf",
  pages: [
    { pageNumber: 1, pageType: "unknown" },
    { pageNumber: 2, pageType: "unknown" }
  ],
  pageInputs: [
    { pageNumber: 1, textExcerpt: "Kitchen floor plan" },
    { pageNumber: 2, textExcerpt: "Wardrobe elevation" }
  ]
};

function clock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test("analyzes project PDF with injected fake sender", async () => {
  const result = await analyzeProjectPdf(pdfInput, {
    sendPdfAiRequest: async (_request, context) => {
      if (context.stage === "page_classification") {
        return JSON.stringify({
          pages: [
            { pageNumber: 1, pageType: "floor_plan", confidence: 0.8 },
            { pageNumber: 2, pageType: "elevation", confidence: 0.7 }
          ]
        });
      }
      return JSON.stringify({
        rooms: [{ id: "r1", label: "Kitchen", sourcePages: [1] }],
        furnitureZones: [{ id: "z1", zoneType: "kitchen", sourcePage: 1, dimensions: { widthMm: 3200 } }]
      });
    },
    now: clock(100, 135)
  });

  assert.equal(result.analysisVersion, "project-pdf-analysis/v1");
  assert.equal(result.manifest.pages[0].pageType, "floor_plan");
  assert.equal(result.manifest.pages[0].furnitureZones[0].zoneType, "kitchen");
  assert.equal(result.extraction.furnitureZones[0].dimensions.widthMm, 3200);
  assert.deepEqual(result.meta, {
    provider: "openai",
    model: "gpt-4o-mini",
    processingTimeMs: 35,
    classificationRequestBuilt: true,
    extractionRequestBuilt: true
  });
});

test("calls sender with request objects and stage context", async () => {
  const calls = [];
  await analyzeProjectPdf(pdfInput, {
    sendPdfAiRequest: async (request, context) => {
      calls.push({ request, context });
      return context.stage === "page_classification"
        ? JSON.stringify({ pages: [{ pageNumber: 1, pageType: "floor_plan", confidence: 0.6 }] })
        : JSON.stringify({ furnitureZones: [{ zoneType: "kitchen", sourcePage: 1 }] });
    }
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].request.url, /chat\/completions$/);
  assert.equal(calls[0].context.stage, "page_classification");
  assert.equal(calls[1].context.stage, "room_extraction");
  assert.match(calls[1].request.body.messages[1].content, /furniture-zone extraction/);
});

test("uses provider model and env", async () => {
  const calls = [];
  const result = await analyzeProjectPdf(pdfInput, {
    providerName: "groq",
    model: "custom-pdf-model",
    env: { GROQ_API_KEY: "secret" },
    sendPdfAiRequest: async (request, context) => {
      calls.push(request);
      return context.stage === "page_classification"
        ? JSON.stringify({ pages: [{ pageNumber: 1, pageType: "floor_plan" }] })
        : JSON.stringify({ furnitureZones: [{ zoneType: "kitchen", sourcePage: 1 }] });
    }
  });

  assert.equal(calls[0].url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(calls[0].headers.Authorization, "Bearer secret");
  assert.equal(calls[0].body.model, "custom-pdf-model");
  assert.equal(result.meta.provider, "groq");
  assert.equal(result.meta.model, "custom-pdf-model");
});

test("without sender returns safe default and does not build requests", async () => {
  const result = await analyzeProjectPdf(pdfInput, { now: clock(10, 15) });

  assert.equal(result.meta.error, "sendPdfAiRequest must be provided.");
  assert.equal(result.meta.processingTimeMs, 5);
  assert.equal(result.meta.classificationRequestBuilt, false);
  assert.equal(result.meta.extractionRequestBuilt, false);
  assert.deepEqual(result.classification.pages, []);
  assert.deepEqual(result.extraction.furnitureZones, []);
});

test("classification invalid JSON stops before extraction", async () => {
  const calls = [];
  const result = await analyzeProjectPdf(pdfInput, {
    sendPdfAiRequest: async (_request, context) => {
      calls.push(context.stage);
      return "{bad";
    }
  });

  assert.deepEqual(calls, ["page_classification"]);
  assert.equal(result.meta.error, "PDF page classification returned no usable pages.");
  assert.equal(result.meta.classificationRequestBuilt, true);
  assert.equal(result.meta.extractionRequestBuilt, false);
});

test("sender error returns safe default without throwing", async () => {
  const result = await analyzeProjectPdf(pdfInput, {
    sendPdfAiRequest: async () => {
      throw new Error("Provider unavailable");
    }
  });

  assert.equal(result.meta.error, "Provider unavailable");
  assert.deepEqual(result.classification.pages, []);
  assert.deepEqual(result.extraction.furnitureZones, []);
});

test("supports OpenAI-like response objects", async () => {
  const result = await analyzeProjectPdf(pdfInput, {
    sendPdfAiRequest: async (_request, context) => ({
      choices: [{
        message: {
          content: context.stage === "page_classification"
            ? JSON.stringify({ pages: [{ pageNumber: 2, pageType: "elevation" }] })
            : JSON.stringify({ furnitureZones: [{ zoneType: "wardrobe", sourcePage: 2 }] })
        }
      }]
    })
  });

  assert.equal(result.manifest.pages[1].pageType, "elevation");
  assert.equal(result.manifest.pages[1].furnitureZones[0].zoneType, "wardrobe");
});

test("does not call fetch", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
  };

  try {
    await analyzeProjectPdf(pdfInput, {
      sendPdfAiRequest: async (_request, context) => (
        context.stage === "page_classification"
          ? JSON.stringify({ pages: [{ pageNumber: 1, pageType: "floor_plan" }] })
          : JSON.stringify({ furnitureZones: [{ zoneType: "kitchen", sourcePage: 1 }] })
      )
    });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not mutate input", async () => {
  const input = structuredClone(pdfInput);
  const snapshot = structuredClone(input);

  await analyzeProjectPdf(input, {
    sendPdfAiRequest: async (_request, context) => (
      context.stage === "page_classification"
        ? JSON.stringify({ pages: [{ pageNumber: 1, pageType: "floor_plan" }] })
        : JSON.stringify({ furnitureZones: [{ zoneType: "kitchen", sourcePage: 1 }] })
    )
  });

  assert.deepEqual(input, snapshot);
});
