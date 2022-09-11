import HelloWorld from '../../src/components/HelloWorld.vue';

const msg = 'Some random test message';

describe('HelloWorld.cy.js', () => {
  it('playground', () => {
    cy.mount(HelloWorld, {
      propsData: { msg },
    })
      .then(() => {
        cy.contains('h1', msg);
        cy.screenshot('test-file#0')
        cy.get('[data-testid="description"]').screenshot('test-file#1');
      })
  })
})
