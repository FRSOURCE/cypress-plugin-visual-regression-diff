describe("My First Test", () => {
  it("Visits the app root url", () => {
    cy.visit("/");
    cy.contains("h1", "Welcome to Your Vue.js App");
    cy.matchImage().then(({ imgNewPath }) => {
      // match against image from custom path
      cy.matchImage({ matchAgainstPath: imgNewPath });
    });
  });
});
