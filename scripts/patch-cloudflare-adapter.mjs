/**
 * Patches @astrojs/cloudflare to stop injecting the reserved "ASSETS" binding
 * into the generated prerender wrangler config. Wrangler v4+ throws when it
 * sees that name in a Pages project. Pages always provides env.ASSETS
 * automatically at runtime, so the config entry is unnecessary.
 *
 * Run via postinstall: "postinstall": "node scripts/patch-cloudflare-adapter.mjs"
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "node_modules/@astrojs/cloudflare/dist/wrangler.js");

const original = "assets: hasAssetsBinding ? undefined : { binding: DEFAULT_ASSETS_BINDING_NAME },";
const replacement = "assets: undefined, // patched: ASSETS is reserved in Pages; env.ASSETS is auto-provided";

const src = readFileSync(target, "utf8");

if (!src.includes(original)) {
  // Either already patched or adapter was updated — either way, nothing to do.
  console.log("patch-cloudflare-adapter: already applied or not needed, skipping.");
  process.exit(0);
}

writeFileSync(target, src.replace(original, replacement), "utf8");
console.log("patch-cloudflare-adapter: applied successfully.");
