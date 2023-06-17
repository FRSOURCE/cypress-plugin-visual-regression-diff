describe("Cleanup test", () => {
  it("Create screenshot to be removed", () => {
    cy.visit("/");
    cy.get('[data-testid="description"]').matchImage();
  });
});
