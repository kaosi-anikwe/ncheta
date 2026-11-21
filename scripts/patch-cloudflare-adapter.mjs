/**
 * Patches @astrojs/cloudflare/dist/wrangler.js to remove two bindings that
 * wrangler v4+ rejects in Pages projects:
 *
 *  1. assets: { binding: "ASSETS" } — "ASSETS" is a reserved name in Pages.
 *     Pages always provides env.ASSETS automatically; the config entry is not needed.
 *
 *  2. kv_namespaces: [{ binding: "SESSION" }] — KV entries must have an "id" field.
 *     The adapter emits this entry without an id (expecting auto-provisioning), but
 *     wrangler v4+ validation rejects it before auto-provisioning can occur.
 *     We are not using Astro sessions so removing it entirely is safe.
 *
 * Remove this script (and the postinstall entry in package.json) once
 * @astrojs/cloudflare ships a fix.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "node_modules/@astrojs/cloudflare/dist/wrangler.js");

const patches = [
  {
    original: "assets: hasAssetsBinding ? undefined : { binding: DEFAULT_ASSETS_BINDING_NAME },",
    replacement: "assets: undefined, // patched: ASSETS is reserved in Pages; env.ASSETS is auto-provided",
    name: "ASSETS binding",
  },
  {
    original: "kv_namespaces: !needsSessionKVBinding || hasSessionBinding ? undefined : [{ binding: sessionKVBindingName }],",
    replacement: "kv_namespaces: undefined, // patched: SESSION KV without id fails wrangler v4+ validation; not using Astro sessions",
    name: "SESSION KV binding",
  },
];

let src = readFileSync(target, "utf8");
let changed = false;

for (const { original, replacement, name } of patches) {
  if (!src.includes(original)) {
    console.log(`patch-cloudflare-adapter: ${name} — already applied or not needed, skipping.`);
    continue;
  }
  src = src.replace(original, replacement);
  changed = true;
  console.log(`patch-cloudflare-adapter: ${name} — applied.`);
}

if (changed) {
  writeFileSync(target, src, "utf8");
} else {
  console.log("patch-cloudflare-adapter: nothing to patch.");
}
