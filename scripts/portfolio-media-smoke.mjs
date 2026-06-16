import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const baseUrl = clean(process.env.PORTFOLIO_SMOKE_BASE_URL);
const token = clean(process.env.PORTFOLIO_SMOKE_ADMIN_TOKEN);
const imagePath = clean(process.env.PORTFOLIO_SMOKE_IMAGE);
const publish = process.env.PORTFOLIO_SMOKE_PUBLISH === "true";

if (!baseUrl || !token || !imagePath) {
  console.error("Required env: PORTFOLIO_SMOKE_BASE_URL, PORTFOLIO_SMOKE_ADMIN_TOKEN, PORTFOLIO_SMOKE_IMAGE.");
  process.exit(2);
}

const item = await createItem();
const uploaded = await uploadImage(item.id);
if (publish) await publishItem(item.id);

console.log(JSON.stringify({
  ok: true,
  itemId: item.id,
  status: publish ? "published" : "draft",
  imageUrl: uploaded.images?.[0]?.imageUrl || "",
  storageKey: uploaded.images?.[0]?.storageKey || ""
}, null, 2));

async function createItem() {
  const response = await requestJson("/api/portfolio", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify({
      title: `Portfolio media smoke ${new Date().toISOString()}`,
      categoryCode: "other",
      description: "Temporary portfolio media production smoke item.",
      status: "draft"
    })
  });
  return response.item;
}

async function uploadImage(itemId) {
  const bytes = await readFile(imagePath);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: mimeFromPath(imagePath) }), basename(imagePath));
  form.set("altText", "Portfolio media smoke test");
  const response = await requestJson(`/api/portfolio/${itemId}/images/upload`, {
    method: "POST",
    headers: { "x-admin-token": token },
    body: form
  });
  return response.item;
}

async function publishItem(itemId) {
  await requestJson(`/api/portfolio/${itemId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify({ published: true })
  });
}

async function requestJson(path, init) {
  const response = await fetch(`${baseUrl.replace(/\/+$/g, "")}${path}`, init);
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    throw new Error(`${path} failed: ${response.status} ${json.error || json.message || "unknown_error"}`);
  }
  return json;
}

function mimeFromPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
