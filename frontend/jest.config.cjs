/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    // Path alias
    '^@/(.*)$': '<rootDir>/src/$1',
    // CSS modules → identity proxy (class names returned as-is)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Static assets → stub
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$': '<rootDir>/__mocks__/fileMock.cjs',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};
