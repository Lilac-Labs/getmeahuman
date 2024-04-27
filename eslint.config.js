export default {
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: {
      expect: 'writeable',
      test: 'writeable',
      process: 'readable'
    }
  },
  linterOptions: {
    reportUnusedDisableDirectives: true
  },
  rules: {
    indent: ['error', 2, { 'SwitchCase': 1 }],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always']
  }
};
