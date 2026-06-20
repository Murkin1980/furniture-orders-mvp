function text(value, fallback = "") {
  return value === undefined || value === null ? fallback : String(value).trim();
}

function integer(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function enabled(value) {
  return text(value).toLowerCase() === "true";
}

export function createConfig(overrides = {}, env = process.env) {
  const signingSecret = text(overrides.signingSecret ?? env.SKETCHUP_NODE_SIGNING_SECRET);
  if (signingSecret.length < 32) {
    throw new Error("SKETCHUP_NODE_SIGNING_SECRET must contain at least 32 characters.");
  }

  const host = text(overrides.host ?? env.SKETCHUP_NODE_HOST, "127.0.0.1");
  const port = integer(overrides.port ?? env.SKETCHUP_NODE_PORT, 8790);
  const maxBodyBytes = integer(overrides.maxBodyBytes ?? env.SKETCHUP_NODE_MAX_BODY_BYTES, 262144);
  const executionEnabled = enabled(
    overrides.executionEnabled ?? env.SKETCHUP_NODE_EXECUTION_ENABLED
  );
  if (!host) throw new Error("SKETCHUP_NODE_HOST must not be empty.");
  if (port < 0 || port > 65535) throw new Error("SKETCHUP_NODE_PORT must be between 0 and 65535.");
  if (maxBodyBytes < 1024 || maxBodyBytes > 1048576) {
    throw new Error("SKETCHUP_NODE_MAX_BODY_BYTES must be between 1024 and 1048576.");
  }

  return {
    host,
    port,
    maxBodyBytes,
    signingSecret,
    executionEnabled,
    mode: executionEnabled ? "execution-gated" : "dry-run"
  };
}
