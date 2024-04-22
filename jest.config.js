module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
  ],
  // transform: { '^.+\\.tsx?$': 'ts-jest' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  testRegex: [
    '__tests__.+\\.spec\\.ts',
  ],
  testPathIgnorePatterns: [
    '/.git/',
    '/.idea/',
    '/.run/',
    '/_data/',
    '/_server-script/',
    '/_sql/',
    '/_misc/',
    '/_tmp/',
    '/coverage/',
    '/common/',
    '/config/',
    '/deploy/',
    '/doc/',
    '/dist/',
    '/i18n/',
    '/pub/',
    '/node_modules/',
    '/src/',
    '/systemd-service/',
  ],
  // globals: { 'ts-jest': { tsconfig: 'tsconfig.json' } },
  // testSequencer: '<rootDir>/src/__tests__/test-sequencer.js',
  // globalSetup: '<rootDir>/src/__tests__/global-setup.ts',
  // globalTeardown: '<rootDir>/src/__tests__/global-teardown.ts',
  testTimeout: 100_000,
};
