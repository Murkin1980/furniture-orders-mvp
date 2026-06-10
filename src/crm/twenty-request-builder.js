import { buildTwentySyncPayload } from "./twenty-mapper.js";

export const TWENTY_REQUEST_VERSION = 1;

const RESOURCE_PATHS = {
  person: "/rest/people",
  opportunity: "/rest/opportunities",
  note: "/rest/notes"
};

export function normalizeTwentyBaseUrl(value) {
  const baseUrl = typeof value === "string" ? value.trim() : "";
  if (!baseUrl) {
    throw new Error("TWENTY_API_BASE_URL is required.");
  }

  return baseUrl.replace(/\/+$/, "");
}

export function buildTwentyRequest({ resource, payload, env = {} } = {}) {
  const path = RESOURCE_PATHS[resource];
  if (!path) {
    throw new Error(`Unsupported Twenty resource: ${resource || "empty"}.`);
  }

  const body = asObject(payload);
  const apiKey = textValue(env.TWENTY_API_KEY);
  const headers = {
    "Content-Type": "application/json"
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return {
    resource,
    url: `${normalizeTwentyBaseUrl(env.TWENTY_API_BASE_URL)}${path}`,
    method: "POST",
    headers,
    body: structuredClone(body)
  };
}

export function buildTwentySyncRequests(order, env = {}) {
  const payload = buildTwentySyncPayload(order);

  return {
    requests: [
      buildTwentyRequest({ resource: "person", payload: payload.person, env }),
      buildTwentyRequest({ resource: "opportunity", payload: payload.opportunity, env }),
      buildTwentyRequest({ resource: "note", payload: payload.note, env })
    ],
    meta: {
      ...payload.meta,
      requestVersion: TWENTY_REQUEST_VERSION
    }
  };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function textValue(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
