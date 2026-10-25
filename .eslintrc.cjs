module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'build', 'node_modules', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      // Player-facing copy lives in src/i18n (one typed catalogue per language), so words
      // never sit inline in JSX. See docs/00-foundation/RULES.md §3 and src/i18n/en-GB.ts.
      files: ['src/pages/**/*.tsx', 'src/components/**/*.tsx'],
      // Staff screens and the legal prose of /privacy and /terms are the recorded exceptions.
      excludedFiles: [
        'src/pages/admin*',
        'src/pages/admin/**',
        'src/components/admin/**',
        'src/pages/PrivacyPage.tsx',
        'src/pages/TermsPage.tsx',
      ],
      rules: {
        'no-restricted-syntax': [
          'warn',
          {
            selector: 'JSXText[value=/[A-Za-z]/]',
            message: 'Move this copy into the i18n catalogue (src/i18n/en-GB.ts) and use t.',
          },
          {
            selector:
              'JSXAttribute[name.name=/^(aria-label|placeholder|alt|title|label|heading|lead|emptyText)$/] > Literal[value=/[A-Za-z]/]',
            message: 'Move this copy into the i18n catalogue (src/i18n/en-GB.ts) and use t.',
          },
        ],
      },
    },
  ],
};
