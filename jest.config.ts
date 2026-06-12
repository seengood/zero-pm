import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    // Add more setup options before each test is run
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@svar-ui/react-gantt$': '<rootDir>/src/__mocks__/react-gantt.js',
        '^@svar-ui/react-core$': '<rootDir>/src/__mocks__/react-core.js',
    },
    testMatch: [
        "<rootDir>/src/**/__tests__/**/*.+(ts|tsx|js|jsx)",
        "<rootDir>/src/**/?(*.)+(spec|test).+(ts|tsx|js|jsx)"
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/app/**', // Exclude all app pages
        '!src/contexts/**', // Exclude contexts (integration test territory)
        '!src/lib/test-helpers.ts', // Exclude test helpers
        '!src/types/**', // Exclude type definitions
        '!src/middleware.ts', // Exclude Next.js middleware
    ],
    coverageThreshold: {
        global: {
            branches: 68,
            functions: 60,
            lines: 69,
            statements: 69,
        },
        './src/lib/': {
            branches: 68,
            functions: 74,
            lines: 80,
            statements: 80,
        },
        './src/hooks/': {
            branches: 55,
            functions: 57,
            lines: 55,
            statements: 55,
        },
        './src/components/': {
            branches: 63,
            functions: 38,
            lines: 63,
            statements: 63,
        },
    },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
