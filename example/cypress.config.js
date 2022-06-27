// eslint-disable-next-line @typescript-eslint/no-var-requires
const { defineConfig } = require("cypress");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initPlugin } = require("@frsource/cypress-plugin-visual-regression-diff/dist/plugins");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"
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
