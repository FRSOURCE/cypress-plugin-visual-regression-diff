import { defineConfig } from "cypress";
import { initPlugin } from "@frsource/cypress-plugin-visual-regression-diff/plugins";

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
  },

  component: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    devServer: {
      framework: "vue-cli",
      bundler: "webpack",
    },
  },
});
