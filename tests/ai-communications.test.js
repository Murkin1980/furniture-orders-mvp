import test from "node:test";
import assert from "node:assert/strict";
import { AI_AGENT_ACTIONS, canAiAgentPerform, getAiAgentActionPolicy } from "../src/ai/communications-policy.js";
import { buildReplySuggestionPrompt, parseReplySuggestion, suggestReply } from "../src/ai/suggest-reply.js";

test("policy permits suggestions but forbids autonomous actions", () => {
  assert.equal(canAiAgentPerform(AI_AGENT_ACTIONS.SUGGEST_REPLY), true);
  assert.equal(canAiAgentPerform(AI_AGENT_ACTIONS.SEND_MESSAGE), false);
  assert.equal(canAiAgentPerform(AI_AGENT_ACTIONS.UPDATE_ORDER), false);
  assert.equal(getAiAgentActionPolicy("unknown").requiresHumanApproval, true);
});
test("prompt excludes direct contact data and includes furniture context", () => {
  const prompt = buildReplySuggestionPrompt({
    phone: "+77000000000",
    email: "client@example.test",
    address: "Private address",
    furnitureType: "kitchen",
    description: "Need a corner kitchen",
    aiNextQuestion: "What are the dimensions?"
  });
  assert.match(prompt, /corner kitchen/);
  assert.match(prompt, /dimensions/);
  assert.doesNotMatch(prompt, /77000000000|client@example|Private address/);
});

test("parser returns a review-only normalized suggestion", () => {
  const result = parseReplySuggestion('```json\n{"reply":"Добрый день! Уточните размеры.","tone":"friendly","channel":"whatsapp","warnings":[]}\n```');
  assert.equal(result.reply, "Добрый день! Уточните размеры.");
  assert.equal(result.tone, "friendly");
  assert.equal(result.requiresHumanApproval, true);
});

test("invalid suggestion returns safe empty default", () => {
  assert.equal(parseReplySuggestion("{invalid").reply, "");
  assert.equal(parseReplySuggestion("").requiresHumanApproval, true);
});

test("suggestReply uses injected sender and never sends a customer message", async () => {
  let request;
  const result = await suggestReply({ furnitureType: "wardrobe" }, {
    sendAiRequest: async (value) => {
      request = value;
      return '{"reply":"Уточните ширину ниши.","tone":"concise","channel":"messenger","warnings":[]}';
    }
  });
  assert.match(request.url, /chat\/completions$/);
  assert.equal(result.reply, "Уточните ширину ниши.");
  assert.equal(result.requiresHumanApproval, true);
});
