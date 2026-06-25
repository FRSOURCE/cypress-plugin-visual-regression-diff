// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

Cypress.on('window:before:load', win => {
  // TODO: remove when Cypress update electron to version >= 28.0.0
  win.URL.canParse = function canParse(url, ...rest: [string?]) {
    const urlString = String(url);
    const base = rest.length === 0 || rest[0] === undefined ? undefined : String(rest[0]);
    try {
      return !!new URL(urlString, base);
    } catch {
      return false;
    }
  };
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
