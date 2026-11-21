// @ts-check
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://nchetamagazine.com",
  output: "static",
  adapter: cloudflare(),

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@sanity/client"],
    },
  },

  integrations: [
    pagefind(),
    sitemap({
      filter: (page) =>
        !page.includes("/store/cart") &&
        !page.includes("/store/checkout") &&
        !page.includes("/store/order/") &&
        !page.includes("/admin/"),
    }),
  ],
});
