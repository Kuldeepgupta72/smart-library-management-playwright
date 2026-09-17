import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './bddTest';
import LibraryBooksPage from '../pages/library/LibraryBooksPage';
import LibraryMembersPage from '../pages/library/LibraryMembersPage';
import LibraryIssuePage from '../pages/library/LibraryIssuePage';

const { Given, When, Then } = createBdd(test);

interface Kan7TestData {
  kan7Overdue: {
    overdueBookTitle: string;
    overdueBookAuthor: string;
    overdueMemberName: string;
    notDueBookTitle: string;
    notDueBookAuthor: string;
    notDueMemberName: string;
    dueTodayBookTitle: string;
    dueTodayBookAuthor: string;
    dueTodayMemberName: string;
    emptyStateMessage: string;
  };
}

interface SeedFixtures {
  libraryBooksPage: LibraryBooksPage;
  libraryMembersPage: LibraryMembersPage;
  libraryIssuePage: LibraryIssuePage;
}

/**
 * Issues a uniquely-named book to a uniquely-named member through the real
 * UI flow (Books -> Members -> Issue), the same way KAN-18/KAN-19 seed
 * data. This produces a normal, "not yet due" active loan; overdue/
 * boundary scenarios then hand the returned isbn/memberEmail to
 * loanSeeder.backdateLoan() to rewrite just that loan's dates.
 */
async function seedActiveLoan(
  { libraryBooksPage, libraryMembersPage, libraryIssuePage }: SeedFixtures,
  bookTitle: string,
  bookAuthor: string,
  memberName: string
): Promise<{ isbn: string; memberEmail: string }> {
  const ts = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const uniqueTitle = `${bookTitle} ${ts}`;
  const uniqueMemberName = `${memberName} ${ts}`;
  const isbn = `978KAN7${ts}`;
  const memberEmail = `kan7.${ts}@example.com`;

  await libraryBooksPage.open();
  await libraryBooksPage.addBookAndWaitForPersist(uniqueTitle, bookAuthor, isbn);

  await libraryMembersPage.open();
  await libraryMembersPage.addMember(uniqueMemberName, memberEmail);
  await libraryMembersPage.expectMemberAddedSuccessfully(memberEmail);

  await libraryIssuePage.open();
  await libraryIssuePage.issueBook(uniqueTitle, uniqueMemberName);
  await libraryIssuePage.expectDueDateShown();

  return { isbn, memberEmail };
}

Given(
  'a loan that is overdue by {int} days exists in the library',
  async ({ libraryBooksPage, libraryMembersPage, libraryIssuePage, dataLoader, state, loanSeeder }, days: number) => {
    const { kan7Overdue } = dataLoader.load<Kan7TestData>('library-testdata.json');
    const { isbn, memberEmail } = await seedActiveLoan(
      { libraryBooksPage, libraryMembersPage, libraryIssuePage },
      kan7Overdue.overdueBookTitle,
      kan7Overdue.overdueBookAuthor,
      kan7Overdue.overdueMemberName
    );
    loanSeeder.backdateLoan(isbn, memberEmail, days);
    state.overdueIsbn = isbn;
    state.overdueMemberEmail = memberEmail;
    state.overdueDays = days;
  }
);

Given(
  'a loan that is not yet due exists in the library',
  async ({ libraryBooksPage, libraryMembersPage, libraryIssuePage, dataLoader, state }) => {
    const { kan7Overdue } = dataLoader.load<Kan7TestData>('library-testdata.json');
    const { isbn } = await seedActiveLoan(
      { libraryBooksPage, libraryMembersPage, libraryIssuePage },
      kan7Overdue.notDueBookTitle,
      kan7Overdue.notDueBookAuthor,
      kan7Overdue.notDueMemberName
    );
    state.notDueIsbn = isbn;
  }
);

Given(
  'a loan that is due exactly today exists in the library',
  async ({ libraryBooksPage, libraryMembersPage, libraryIssuePage, dataLoader, state, loanSeeder }) => {
    const { kan7Overdue } = dataLoader.load<Kan7TestData>('library-testdata.json');
    const { isbn, memberEmail } = await seedActiveLoan(
      { libraryBooksPage, libraryMembersPage, libraryIssuePage },
      kan7Overdue.dueTodayBookTitle,
      kan7Overdue.dueTodayBookAuthor,
      kan7Overdue.dueTodayMemberName
    );
    // 0 days overdue == due_date is exactly today's date.
    loanSeeder.backdateLoan(isbn, memberEmail, 0);
    state.dueTodayIsbn = isbn;
  }
);

Given('there are no overdue loans in the library', async ({ loanSeeder }) => {
  loanSeeder.clearAllOverdueLoans();
});

When('I open the Overdue Loans view', async ({ libraryOverduePage }) => {
  await libraryOverduePage.open();
});

Then('only the overdue loan should be shown', async ({ libraryOverduePage, state }) => {
  const row = await libraryOverduePage.findRowByIsbn(state.overdueIsbn!);
  expect(row, 'expected the overdue loan to be shown').toBeTruthy();
});

Then('the not-yet-due loan should not be shown', async ({ libraryOverduePage, state }) => {
  const row = await libraryOverduePage.findRowByIsbn(state.notDueIsbn!);
  expect(row, 'expected the not-yet-due loan to be filtered out').toBeUndefined();
});

Then(
  'the overdue loan row should show the member name, member email, book title, book ISBN, issue date, due date, and {int} days overdue',
  async ({ libraryOverduePage, state }, days: number) => {
    const row = await libraryOverduePage.findRowByIsbn(state.overdueIsbn!);
    expect(row, 'expected the overdue loan row to be present').toBeTruthy();
    expect(row!.memberEmail).toBe(state.overdueMemberEmail);
    expect(row!.memberName.length).toBeGreaterThan(0);
    expect(row!.bookTitle.length).toBeGreaterThan(0);
    expect(row!.isbn).toBe(state.overdueIsbn);
    expect(row!.issuedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row!.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row!.daysOverdue).toBe(String(days));
  }
);

Then('I should see the {string} empty state message', async ({ libraryOverduePage }, message: string) => {
  await libraryOverduePage.expectEmptyState(message);
});

Then('that loan should not be shown in the Overdue Loans view', async ({ libraryOverduePage, state }) => {
  const row = await libraryOverduePage.findRowByIsbn(state.dueTodayIsbn!);
  expect(row, 'a loan due exactly today must not be classified as overdue').toBeUndefined();
});

// ---- Regression: existing tabs still function (KAN-7 scope item 5) ----

When('I open the Books tab', async ({ libraryBooksPage }) => {
  await libraryBooksPage.open();
});

Then('the Books tab should load without errors', async ({ page }) => {
  await expect(page.locator('#books-list')).toBeVisible();
});

When('I open the Members tab', async ({ libraryMembersPage }) => {
  await libraryMembersPage.open();
});

Then('the Members tab should load without errors', async ({ page }) => {
  await expect(page.locator('#members-list')).toBeVisible();
});

When('I open the Issue Book tab', async ({ libraryIssuePage }) => {
  await libraryIssuePage.open();
});

Then('the Issue Book tab should load without errors', async ({ page }) => {
  await expect(page.locator('#issue-form')).toBeVisible();
});

When('I open the Return Book tab', async ({ libraryReturnPage }) => {
  await libraryReturnPage.open();
});

Then('the Return Book tab should load without errors', async ({ page }) => {
  await expect(page.locator('#loans-list')).toBeVisible();
});
