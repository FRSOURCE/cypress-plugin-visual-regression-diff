import { mount } from "cypress/vue";
import HelloWorld from "../../src/components/HelloWorld.vue";

const msg = "Some random test message";

describe("HelloWorld.cy.js", () => {
  it("playground", () => {
    mount(HelloWorld, {
      propsData: { msg },
    }).then(() => {
      cy.contains("h1", msg);
      cy.matchImage();
      cy.get('[data-testid="description"]').matchImage();
    });
  });
});
