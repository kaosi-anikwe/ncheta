// @ts-check
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "static",

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@sanity/client"],
    },
  },

  integrations: [pagefind()],
});
