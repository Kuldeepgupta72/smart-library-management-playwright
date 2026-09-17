import { test as base } from 'playwright-bdd';
import LibraryBooksPage from '../pages/library/LibraryBooksPage';
import LibraryMembersPage from '../pages/library/LibraryMembersPage';
import LibraryIssuePage from '../pages/library/LibraryIssuePage';
import LibraryReturnPage from '../pages/library/LibraryReturnPage';
import LibraryOverduePage from '../pages/library/LibraryOverduePage';
import { DataLoader } from '../utils/DataLoader';
import { LoanSeeder } from '../utils/LoanSeeder';
import { envConfig, EnvironmentConfig } from '../config/ConfigManager';

/**
 * BDD test object for the Library suite. createBdd() requires a test
 * extended from playwright-bdd's own `test` (not the one in baseTest.ts),
 * so the Library page-object/data fixtures are re-registered here on top
 * of it, following the exact same fixture pattern as baseTest.ts.
 */
export interface ScenarioState {
  isbn?: string;
  bookTitle?: string;
  memberName?: string;
  memberEmail?: string;
  memberRowCountBefore?: number;
  // KAN-19: member search state
  searchMemberName?: string;
  searchMemberEmail?: string;
  otherMemberName?: string;
  otherMemberEmail?: string;
  searchTerm?: string;
  // KAN-18: filter/sort/pagination state
  availableBookTitle?: string;
  availableBookIsbn?: string;
  issuedBookTitle?: string;
  issuedBookIsbn?: string;
  sortBookATitle?: string;
  sortBookAAuthor?: string;
  sortBookZTitle?: string;
  sortBookZAuthor?: string;
  paginationBookTitlePrefix?: string;
  // KAN-7: overdue loans view state
  overdueIsbn?: string;
  overdueMemberEmail?: string;
  overdueDays?: number;
  notDueIsbn?: string;
  dueTodayIsbn?: string;
}

interface LibraryBddFixtures {
  libraryBooksPage: LibraryBooksPage;
  libraryMembersPage: LibraryMembersPage;
  libraryIssuePage: LibraryIssuePage;
  libraryReturnPage: LibraryReturnPage;
  libraryOverduePage: LibraryOverduePage;
  dataLoader: DataLoader;
  loanSeeder: LoanSeeder;
  envConfig: EnvironmentConfig;
  state: ScenarioState;
}

export const test = base.extend<LibraryBddFixtures>({
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

  libraryOverduePage: async ({ page }, use) => {
    await use(new LibraryOverduePage(page));
  },

  dataLoader: async ({}, use) => {
    await use(new DataLoader());
  },

  // KAN-7: seeds/backdates loans directly against the shared library.db so
  // overdue/boundary preconditions can exist (the app itself can't create
  // them). Any loan it touched is marked returned again on teardown so the
  // shared dev database doesn't accumulate stray overdue loans between runs.
  loanSeeder: async ({}, use) => {
    const seeder = new LoanSeeder();
    await use(seeder);
    seeder.cleanup();
    seeder.close();
  },

  envConfig: async ({}, use) => {
    await use(envConfig);
  },

  state: async ({}, use) => {
    await use({});
  },
});
