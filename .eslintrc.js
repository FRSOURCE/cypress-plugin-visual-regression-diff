module.exports = {
  root: true,
  plugins: ["@typescript-eslint", "eslint-comments", "cypress"],
  env: {
    es6: true,
    node: true,
    "cypress/globals": true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:eslint-comments/recommended",
    "prettier",
  ],
  overrides: [
    {
      files: ["**.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        sourceType: "module",
        project: ["./packages/cypress-plugin-visual-regression-diff/tsconfig.json", "./examples/next/tsconfig.json", "./examples/webpack/tsconfig.json"],
        tsconfigRootDir: __dirname,
        warnOnUnsupportedTypeScriptVersion: false,
        EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
      },
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
      },
    },
  ],
};
