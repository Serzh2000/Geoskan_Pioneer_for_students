export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '\\.(obj|stl)$': '<rootDir>/tests/asset-stub.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
