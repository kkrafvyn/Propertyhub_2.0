// Run npm run test:e2e:marketing to build the marketing site before browser checks.
﻿import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({ ...config, workers: 1, testIgnore: [], testMatch: 'marketing-carousel.spec.ts', use: {...config.use, baseURL: 'http://127.0.0.1:5174'}, webServer: {command:'npm run preview -- --host 127.0.0.1 --port 5174',url:'http://127.0.0.1:5174',reuseExistingServer:!process.env.CI,timeout:120000} });
