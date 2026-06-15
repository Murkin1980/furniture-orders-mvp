import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderRenderAttachment,
  buildSketchUpRenderArtifact,
  validateSketchUpRenderArtifact
} from "../src/sketchup/render-artifact.js";

const HASH = "a".repeat(64);
const NOW = "2026-06-16T13:00:00.000Z";

test("builds a versioned render artifact manifest", () => {
  const result = buildSketchUpRenderArtifact({ files: files() }, { orderId: 8, jobId: "job-render-001", now: NOW });
  assert.equal(result.ok, true);
  assert.equal(result.artifact.summary.modelIncluded, true);
  assert.equal(result.artifact.summary.renderCount, 1);
});

test("builds a future order attachment payload", () => {
  const artifact = buildSketchUpRenderArtifact({ files: files() }, { orderId: 8, jobId: "job-render-001", now: NOW }).artifact;
  const result = buildOrderRenderAttachment(artifact);
  assert.equal(result.ok, true);
  assert.equal(result.attachment.primaryStorageKey, "orders/8/render/main.webp");
  assert.equal(result.attachment.modelStorageKey, "orders/8/model/design.skp");
  assert.equal(JSON.parse(result.attachment.manifestJson).jobId, "job-render-001");
});

test("requires a render or preview", () => {
  const result = buildSketchUpRenderArtifact({ files: [files()[0]] }, { orderId: 8, jobId: "job-render-001", now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.error, "render_or_preview_required");
});

test("rejects absolute, traversal, and Windows filesystem paths", () => {
  for (const storageKey of ["/orders/render.webp", "../render.webp", "C:\\render.webp"]) {
    const changed = files().map((file, index) => index === 1 ? { ...file, storageKey } : file);
    assert.equal(buildSketchUpRenderArtifact({ files: changed }, { orderId: 8, jobId: "job-render-001", now: NOW }).ok, false);
  }
});

test("rejects unknown media types and invalid hashes", () => {
  const unknown = files().map((file, index) => index === 1 ? { ...file, mediaType: "text/html" } : file);
  const invalidHash = files().map((file, index) => index === 1 ? { ...file, sha256: "bad" } : file);
  assert.equal(buildSketchUpRenderArtifact({ files: unknown }, { orderId: 8, jobId: "job-render-001", now: NOW }).ok, false);
  assert.equal(buildSketchUpRenderArtifact({ files: invalidHash }, { orderId: 8, jobId: "job-render-001", now: NOW }).ok, false);
});

test("rejects duplicate storage keys", () => {
  const duplicate = files().map((file) => ({ ...file, storageKey: "orders/8/shared.bin" }));
  const result = buildSketchUpRenderArtifact({ files: duplicate }, { orderId: 8, jobId: "job-render-001", now: NOW });
  assert.equal(result.error, "duplicate_artifact_file");
});

test("does not mutate source files", () => {
  const source = files();
  const copy = structuredClone(source);
  buildSketchUpRenderArtifact({ files: source }, { orderId: 8, jobId: "job-render-001", now: NOW });
  assert.deepEqual(source, copy);
});

test("invalid artifact cannot become an order attachment", () => {
  const result = buildOrderRenderAttachment({});
  assert.equal(result.ok, false);
  assert.equal(result.attachment, null);
  assert.equal(validateSketchUpRenderArtifact({}).ok, false);
});

function files() {
  return [
    {
      role: "model",
      mediaType: "application/vnd.sketchup.skp",
      storageKey: "orders/8/model/design.skp",
      bytes: 12000,
      sha256: HASH
    },
    {
      role: "render",
      mediaType: "image/webp",
      storageKey: "orders/8/render/main.webp",
      bytes: 8000,
      sha256: HASH
    }
  ];
}
