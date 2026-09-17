import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './bddTest';
import LibraryBooksPage from '../pages/library/LibraryBooksPage';
import LibraryMembersPage from '../pages/library/LibraryMembersPage';
import LibraryIssuePage from '../pages/library/LibraryIssuePage';

const { Given, When, Then } = createBdd(test);

interface Aisdlc2TestData {
  aisdlc2Fines: {
    flatRatePerDay: number;
    overdueBookTitle: string;
    overdueBookAuthor: string;
    overdueMemberName: string;
    nonExistentLoanId: number;
  };
}

/**
 * AISDLC-2 — Overdue-loan fine calculation and lifecycle. This story is
 * API-only (no member-facing fines UI per requirements "Out of Scope"),
 * so scenarios call GET /api/loans/overdue, POST /:id/pay-fine, and
 * POST /:id/waive-fine directly via Playwright's `request` fixture
 * against envConfig.libraryBaseUrl, instead of driving a page object.
 *
 * Preconditions are seeded the same way the KAN-7 overdue suite does:
 * issue a real loan through the UI (Books -> Members -> Issue), then use
 * loanSeeder.backdateLoan() to rewrite that one loan's dates so it is
 * N days overdue (the app itself has no way to backdate a loan).
 * loanSeeder.backdateLoan() returns the loan id, which every AISDLC-2
 * scenario needs to call the pay-fine/waive-fine endpoints directly.
 */

interface OverdueLoanApiEntry {
  id: number;
  issued_date: string;
  due_date: string;
  book_id: number;
  title: string;
  isbn: string;
  member_id: number;
  name: string;
  email: string;
  days_overdue: number;
  fine_amount: number | null;
  fine_paid: boolean;
  fine_waived: boolean;
}

interface SeedFixtures {
  libraryBooksPage: LibraryBooksPage;
  libraryMembersPage: LibraryMembersPage;
  libraryIssuePage: LibraryIssuePage;
}

async function seedActiveLoan(
  { libraryBooksPage, libraryMembersPage, libraryIssuePage }: SeedFixtures,
  bookTitle: string,
  bookAuthor: string,
  memberName: string
): Promise<{ isbn: string; memberEmail: string }> {
  const ts = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const uniqueTitle = `${bookTitle} ${ts}`;
  const uniqueMemberName = `${memberName} ${ts}`;
  const isbn = `978FINE${ts}`;
  const memberEmail = `aisdlc2.fine.${ts}@example.com`;

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

// ---- Seeding ----

Given(
  'an overdue loan exists with {int} days overdue',
  async ({ libraryBooksPage, libraryMembersPage, libraryIssuePage, dataLoader, state, loanSeeder }, days: number) => {
    const { aisdlc2Fines } = dataLoader.load<Aisdlc2TestData>('library-testdata.json');
    const { isbn, memberEmail } = await seedActiveLoan(
      { libraryBooksPage, libraryMembersPage, libraryIssuePage },
      aisdlc2Fines.overdueBookTitle,
      aisdlc2Fines.overdueBookAuthor,
      aisdlc2Fines.overdueMemberName
    );
    const loanId = loanSeeder.backdateLoan(isbn, memberEmail, days);
    state.fineIsbn = isbn;
    state.fineMemberEmail = memberEmail;
    state.fineDaysOverdue = days;
    state.fineLoanId = loanId;
  }
);

// Documentation-only step: at this point in every scenario that uses it,
// GET /api/loans/overdue (the only endpoint that calculates and persists
// fine_amount — see src/routes/loans.ts) has never been called for this
// loan, so fine_amount is still NULL server-side.
Given('its fine has never been calculated', async () => {
  // no-op — see comment above
});

Given('the fine has been calculated', async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/loans/overdue`);
  expect(res.ok()).toBe(true);
});

When('the loan is backdated further to {int} days overdue', async ({ state, loanSeeder }, days: number) => {
  loanSeeder.backdateLoan(state.fineIsbn!, state.fineMemberEmail!, days);
  state.fineDaysOverdue = days;
});

// ---- GET /api/loans/overdue ----

When('I request the overdue loans list', async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/loans/overdue`);
  expect(res.ok()).toBe(true);
  state.lastOverdueList = (await res.json()) as OverdueLoanApiEntry[];
});

When('I request the overdue loans list again', async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/loans/overdue`);
  expect(res.ok()).toBe(true);
  state.lastOverdueList = (await res.json()) as OverdueLoanApiEntry[];
});

function findFineLoan(state: { lastOverdueList?: unknown[]; fineLoanId?: number }): OverdueLoanApiEntry {
  const entry = (state.lastOverdueList as OverdueLoanApiEntry[] | undefined)?.find(
    (l) => l.id === state.fineLoanId
  );
  expect(entry, `expected loan id ${state.fineLoanId} to be present in the overdue loans response`).toBeTruthy();
  return entry!;
}

Then(
  "the loan's fine amount should equal the flat rate multiplied by the days overdue",
  async ({ state, dataLoader }) => {
    const { aisdlc2Fines } = dataLoader.load<Aisdlc2TestData>('library-testdata.json');
    const entry = findFineLoan(state);
    expect(typeof entry.fine_amount).toBe('number');
    expect(entry.fine_amount).toBeCloseTo(aisdlc2Fines.flatRatePerDay * state.fineDaysOverdue!, 5);
    state.fineOriginalAmount = entry.fine_amount!;
  }
);

Then("the loan's fine amount should not have changed from the originally calculated amount", async ({ state }) => {
  const entry = findFineLoan(state);
  expect(entry.fine_amount).toBe(state.fineOriginalAmount);
});

Then('the response should still include all pre-existing loan fields for that loan', async ({ state }) => {
  const entry = findFineLoan(state);
  const preExistingFields: (keyof OverdueLoanApiEntry)[] = [
    'id',
    'issued_date',
    'due_date',
    'book_id',
    'title',
    'isbn',
    'member_id',
    'name',
    'email',
    'days_overdue',
  ];
  for (const field of preExistingFields) {
    expect(entry[field], `expected pre-existing field "${field}" to still be present`).not.toBeUndefined();
  }
});

Then(
  'the response should additionally include fine_amount, fine_paid and fine_waived for that loan',
  async ({ state }) => {
    const entry = findFineLoan(state);
    expect(entry).toHaveProperty('fine_amount');
    expect(typeof entry.fine_paid).toBe('boolean');
    expect(typeof entry.fine_waived).toBe('boolean');
  }
);

// ---- POST /:id/pay-fine and /:id/waive-fine ----

When('I pay the fine for that loan', async ({ request, envConfig, state }) => {
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/${state.fineLoanId}/pay-fine`);
  state.lastResponseStatus = res.status();
  state.lastResponseBody = await res.json();
});

When('I waive the fine for that loan', async ({ request, envConfig, state }) => {
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/${state.fineLoanId}/waive-fine`);
  state.lastResponseStatus = res.status();
  state.lastResponseBody = await res.json();
});

When('I pay the fine for the non-existent loan', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc2Fines } = dataLoader.load<Aisdlc2TestData>('library-testdata.json');
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/${aisdlc2Fines.nonExistentLoanId}/pay-fine`);
  state.lastResponseStatus = res.status();
  state.lastResponseBody = await res.json();
});

When('I waive the fine for the non-existent loan', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc2Fines } = dataLoader.load<Aisdlc2TestData>('library-testdata.json');
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/${aisdlc2Fines.nonExistentLoanId}/waive-fine`);
  state.lastResponseStatus = res.status();
  state.lastResponseBody = await res.json();
});

Given('the fine for that loan has already been waived', async ({ request, envConfig, state }) => {
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/${state.fineLoanId}/waive-fine`);
  expect(res.ok()).toBe(true);
});

Given('the fine for that loan has already been paid', async ({ request, envConfig, state }) => {
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/${state.fineLoanId}/pay-fine`);
  expect(res.ok()).toBe(true);
});

Then('the pay-fine request should succeed', async ({ state }) => {
  expect(state.lastResponseStatus).toBe(200);
});

Then('the waive-fine request should succeed', async ({ state }) => {
  expect(state.lastResponseStatus).toBe(200);
});

Then("the loan's fine should be marked as paid and not waived", async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/loans/overdue`);
  expect(res.ok()).toBe(true);
  state.lastOverdueList = (await res.json()) as OverdueLoanApiEntry[];
  const entry = findFineLoan(state);
  expect(entry.fine_paid).toBe(true);
  expect(entry.fine_waived).toBe(false);
});

Then("the loan's fine should be marked as waived and not paid", async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/loans/overdue`);
  expect(res.ok()).toBe(true);
  state.lastOverdueList = (await res.json()) as OverdueLoanApiEntry[];
  const entry = findFineLoan(state);
  expect(entry.fine_waived).toBe(true);
  expect(entry.fine_paid).toBe(false);
});

Then('the request should be rejected with status {int} and message {string}', async ({ state }, status: number, message: string) => {
  expect(state.lastResponseStatus).toBe(status);
  expect(state.lastResponseBody?.error).toBe(message);
});
