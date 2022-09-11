// eslint-disable-next-line @typescript-eslint/no-var-requires
const { defineConfig } = require("cypress");
// eslint-disable-next-ine @typescript-eslint/no-var-requires

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  e2e: {
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('cypress-mochawesome-reporter/plugin')(on);
    },
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"
  },

  component: {
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('cypress-mochawesome-reporter/plugin')(on);
    },
    devServer: {
      framework: "vue-cli",
      bundler: "webpack",
    },
  },
});
