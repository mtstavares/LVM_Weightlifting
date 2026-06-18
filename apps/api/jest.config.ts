import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/**/*.module.ts',
    '!src/shared/infrastructure/**/*.ts',
    '!src/**/infrastructure/**/*.ts',
    '!src/shared/application/**/*.ts',
    '!src/**/presentation/*controller.ts',
    '!src/**/*.types.ts',
    '!src/**/*.repository.ts',
    '!src/**/dto/**/*.ts',
    '!src/**/*decorator.ts',
    '!src/**/*request.ts',
    '!src/**/domain/*errors.ts',
    '!src/**/domain/password-hasher.ts',
    '!src/**/domain/token-service.ts'
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

export default config;
