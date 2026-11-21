/**
 * Post-build: sanitize dist/server/wrangler.json so Cloudflare Pages can deploy it.
 *
 * @astrojs/cloudflare injects auto-provisioned bindings (SESSION KV) without
 * required fields (e.g. "id"). Wrangler v4+ validation rejects these before
 * auto-provisioning can occur, failing the deploy step.
 *
 * We are not using Astro sessions, so removing the SESSION KV entries is safe.
 * Remove this script once @astrojs/cloudflare ships a fix.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "dist/server/wrangler.json");

let config;
try {
  config = JSON.parse(readFileSync(target, "utf8"));
} catch {
  console.warn("fix-deploy-config: dist/server/wrangler.json not found, skipping.");
  process.exit(0);
}

// Remove KV namespaces that have no "id" (they would fail wrangler validation).
const removedKV = [];

if (Array.isArray(config.kv_namespaces)) {
  const before = config.kv_namespaces.length;
  config.kv_namespaces = config.kv_namespaces.filter((kv) => {
    if (!kv.id) { removedKV.push(kv.binding); return false; }
    return true;
  });
  if (config.kv_namespaces.length === 0) delete config.kv_namespaces;
}

if (config.previews?.kv_namespaces) {
  config.previews.kv_namespaces = config.previews.kv_namespaces.filter((kv) => kv.id);
  if (config.previews.kv_namespaces.length === 0) delete config.previews.kv_namespaces;
}

if (removedKV.length > 0) {
  writeFileSync(target, JSON.stringify(config), "utf8");
  console.log(`fix-deploy-config: removed KV namespace(s) without id: ${removedKV.join(", ")}`);
} else {
  console.log("fix-deploy-config: nothing to remove.");
}
