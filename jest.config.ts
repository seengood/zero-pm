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
        '!src/app/layout.tsx',
        '!src/app/page.tsx',
    ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
