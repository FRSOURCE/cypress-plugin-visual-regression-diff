import { defineConfig } from "cypress";
import { initPlugin } from "@frsource/cypress-plugin-visual-regression-diff/plugins";

const webpackConfig = require("./webpack.config.js");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
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
      framework: "vue",
      bundler: "webpack",
      webpackConfig,
    },
  },
});
