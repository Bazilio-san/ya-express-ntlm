module.exports = {
  root: true,
  parserOptions: {
    // project: true,
    // tsconfigRootDir: __dirname,
    // ecmaVersion: 2021, // Allows for the parsing of modern ECMAScript features
    // sourceType: 'module', // Allows for the use of imports
  },
  env: {
    jest: true,
  },
  extends: [
    'eslint-config-af-24',
  ],
  plugins: [],
  ignorePatterns: ['node_modules/', '**/*.json', '**/dist/**/*.*'],
  globals: {},
  rules: {
    'no-plusplus': 'off',
    'class-methods-use-this': 'off',
    'no-mixed-operators': 'off',
    'no-bitwise': 'off',
    'no-param-reassign': 'off',
    'no-await-in-loop': 'off',
    "prefer-destructuring": ["error", {"object": true, "array": false}]
  },
};
