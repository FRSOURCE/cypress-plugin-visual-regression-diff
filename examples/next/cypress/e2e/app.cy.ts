describe("Navigation", () => {
  it("should navigate to the about page", () => {
    cy.visit("http://localhost:3000/");

    cy.get('a[href*="about"]').click();

    cy.url().should("include", "/about");

    cy.matchImage().then(({ imgNewPath }) => {
      // match against image from custom path
      cy.matchImage({ matchAgainstPath: imgNewPath });
    });
  });
});

export {};
