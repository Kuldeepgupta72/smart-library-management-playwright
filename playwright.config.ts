import {defineConfig, devices} from '@playwright/test';
import {defineBddConfig} from 'playwright-bdd';
import ConfigManager from '@config/ConfigManager';

const config = ConfigManager.getInstance();

// Library Management System BDD suite (features/ + src/steps/) — separate
// project from the existing automationexercise.com tests/ui suite below.
const libraryBddTestDir = defineBddConfig({
    features: 'features/**/*.feature',
    steps: ['src/steps/**/*.ts'],
});

export default defineConfig({
    timeout: 30000,
    expect: {timeout: 5000},
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [
        ['html', {outputFolder: 'reports/html-report'}],
        ['json', {outputFolder: 'reports/results.json'}],
        ['list'],
    ],
    use: {
        baseURL: config.getBaseUrl(),
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {name: 'chromium', testDir: './tests', use: {...devices['Desktop Chrome']}},
        {name: 'library-bdd', testDir: libraryBddTestDir, use: {...devices['Desktop Chrome']}},
    ],
});
