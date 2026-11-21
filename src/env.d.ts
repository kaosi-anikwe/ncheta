/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

declare module "cloudflare:workers" {
  const env: Env;
  export { env };
}
