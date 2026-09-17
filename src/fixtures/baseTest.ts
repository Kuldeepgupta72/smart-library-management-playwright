import { test as base } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import CartPage from '../pages/CartPage';
import LibraryBooksPage from '../pages/library/LibraryBooksPage';
import LibraryMembersPage from '../pages/library/LibraryMembersPage';
import LibraryIssuePage from '../pages/library/LibraryIssuePage';
import LibraryReturnPage from '../pages/library/LibraryReturnPage';
import { DataLoader } from '../utils/DataLoader';
import { envConfig, EnvironmentConfig } from '../config/ConfigManager';

/**
 * Custom fixture types extending Playwright's base test.
 *
 * dataLoader and envConfig are themselves fixtures here (not plain class
 * imports) — this is the composed-dependency pattern from the reference
 * framework's baseTest.ts. It keeps every test's dependencies declared in
 * one place (the destructured fixture args) instead of scattered import
 * statements, and makes them trivially mockable/overridable per-test later.
 */
interface CustomFixtures {
  loginPage: LoginPage;
  homePage: HomePage;
  cartPage: CartPage;
  libraryBooksPage: LibraryBooksPage;
  libraryMembersPage: LibraryMembersPage;
  libraryIssuePage: LibraryIssuePage;
  libraryReturnPage: LibraryReturnPage;
  dataLoader: DataLoader;
  envConfig: EnvironmentConfig;
}

export const test = base.extend<CustomFixtures>({

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  libraryBooksPage: async ({ page }, use) => {
    await use(new LibraryBooksPage(page));
  },

  libraryMembersPage: async ({ page }, use) => {
    await use(new LibraryMembersPage(page));
  },

  libraryIssuePage: async ({ page }, use) => {
    await use(new LibraryIssuePage(page));
  },

  libraryReturnPage: async ({ page }, use) => {
    await use(new LibraryReturnPage(page));
  },

  dataLoader: async ({}, use) => {
    await use(new DataLoader());
  },

  envConfig: async ({}, use) => {
    await use(envConfig);
  },
});

export { expect } from '@playwright/test';
