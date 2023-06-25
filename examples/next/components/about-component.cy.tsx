import AboutComponent from './about-component'
// Disable ESLint to prevent failing linting inside the Next.js repo.
// If you're using ESLint on your project, we recommend installing the ESLint Cypress plugin instead:
// https://github.com/cypress-io/eslint-plugin-cypress

describe('<AboutComponent />', () => {
  it('should render and display expected content', () => {
    cy.mount(<AboutComponent />).then(() => {
      cy.matchImage()
      cy.get('h1').matchImage()
    })
  })
})

// Prevent TypeScript from reading file as legacy script
export {}
