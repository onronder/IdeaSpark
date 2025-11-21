module.exports = {
  // Line length and wrapping
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,

  // Semicolons and quotes
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',

  // JSX specific
  jsxSingleQuote: false,
  jsxBracketSameLine: false,

  // Trailing commas and brackets
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'always',

  // Other
  endOfLine: 'auto',
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  embeddedLanguageFormatting: 'auto',

  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
      },
    },
  ],
};