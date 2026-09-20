describe("Navigation", () => {
  it("should navigate to the about page", () => {
    cy.visit("http://localhost:3000/");

    cy.get('a[href*="about"]').click();

    cy.url().should("include", "/about");

    cy.matchImage();
  });

  it("should display the about page content", () => {
    cy.visit("http://localhost:3000/about");

    cy.get('main').should('be.visible').matchImage();

  });
});

export {};
