import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './bddTest';

const { Given, When, Then } = createBdd(test);

interface Aisdlc4TestData {
  aisdlc4EmailUniqueness: {
    knownMemberNamePrefix: string;
    regressionBookTitle: string;
    regressionBookAuthor: string;
    regressionBookIsbn: string;
    regressionMemberNamePrefix: string;
  };
}

interface MemberApiEntry {
  id: number;
  name: string;
  email: string;
  [key: string]: unknown;
}

interface ErrorResponse {
  error: string;
}

interface BookApiEntry {
  id: number;
  title: string;
  author: string;
  isbn: string;
  [key: string]: unknown;
}

/**
 * AISDLC-4 — Enforce email uniqueness on POST /api/members. This story is
 * backend-only (isDuplicateEmail in src/validators.ts,
 * idx_members_email_unique migration in src/db/database.ts, POST
 * /api/members in src/routes/members.ts — no new UI per requirements
 * "Out of Scope"), so scenarios call the API directly via Playwright's
 * `request` fixture against envConfig.libraryBaseUrl, following the same
 * pattern as AISDLC-3 (library-aisdlc3.steps.ts). Scenarios that only need
 * generic "create a member" / "paginated list" / "search" behavior reuse
 * the existing step definitions already registered by
 * library-aisdlc3.steps.ts (e.g. "I create a new member with a unique name
 * and email", "at least one member exists in the library", "a uniquely
 * identifiable member has just been added", "I search for that member by
 * name", "the create member request should return status {int}") rather
 * than redefining them here.
 */

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

// ---- Duplicate-email rejection (AC1/FR1) ----

Given('a member exists with a known email', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc4EmailUniqueness } = dataLoader.load<Aisdlc4TestData>('library-testdata.json');
  const ts = uniqueSuffix();
  const name = `${aisdlc4EmailUniqueness.knownMemberNamePrefix} ${ts}`;
  const email = `aisdlc4.known.${ts}@example.com`;
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/members`, {
    data: { name, email },
  });
  expect(res.status()).toBe(201);
  state.knownMemberName = name;
  state.knownMemberEmail = email;
});

When('I attempt to create another member with that same email', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc4EmailUniqueness } = dataLoader.load<Aisdlc4TestData>('library-testdata.json');
  const differentName = `${aisdlc4EmailUniqueness.knownMemberNamePrefix} Duplicate ${uniqueSuffix()}`;
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/members`, {
    data: { name: differentName, email: state.knownMemberEmail },
  });
  state.lastResponseStatus = res.status();
  state.lastResponseBody = await res.json();
});

Then('the response should contain the error {string}', async ({ state }, expectedMessage: string) => {
  const body = state.lastResponseBody as ErrorResponse;
  expect(body.error).toBe(expectedMessage);
});

// ---- Regression: books + loans issue/return (handoff item 5) ----

When('I add a new book with a unique ISBN via the API', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc4EmailUniqueness } = dataLoader.load<Aisdlc4TestData>('library-testdata.json');
  const uniqueIsbn = `${aisdlc4EmailUniqueness.regressionBookIsbn}-${uniqueSuffix()}`;
  state.regressionBookIsbn = uniqueIsbn;
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/books`, {
    data: {
      title: aisdlc4EmailUniqueness.regressionBookTitle,
      author: aisdlc4EmailUniqueness.regressionBookAuthor,
      isbn: uniqueIsbn,
    },
  });
  state.lastResponseStatus = res.status();
  const body = (await res.json()) as BookApiEntry;
  state.lastResponseBody = body;
  state.regressionBookId = body.id;
});

Then('the create book request should return status {int}', async ({ state }, status: number) => {
  expect(state.lastResponseStatus).toBe(status);
});

When('I issue that book to that member via the API', async ({ request, envConfig, state }) => {
  // Reuses the member created by the shared "I create a new member with a
  // unique name and email" step (library-aisdlc3.steps.ts), which stores
  // the new member's id in state.pagMemberId.
  state.regressionMemberId = state.pagMemberId;
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/issue`, {
    data: { book_id: state.regressionBookId, member_id: state.regressionMemberId },
  });
  state.lastResponseStatus = res.status();
  const body = await res.json();
  state.lastResponseBody = body;
  state.lastIssueDueDate = body.due_date;
});

Then('the issue request should succeed with a due date', async ({ state }) => {
  expect(state.lastResponseStatus).toBe(201);
  expect(typeof state.lastIssueDueDate).toBe('string');
  expect(state.lastIssueDueDate).toBeTruthy();
});

When('I return that loan via the API', async ({ request, envConfig, state }) => {
  // The loan id isn't returned by POST /api/loans/issue, so look it up via
  // GET /api/loans (active loans) by matching on the book we just issued.
  const loansRes = await request.get(`${envConfig.libraryBaseUrl}/api/loans`);
  expect(loansRes.ok()).toBe(true);
  const loans = (await loansRes.json()) as Array<{ id: number; book_id: number; member_id: number }>;
  const matched = loans.find(
    (l) => l.book_id === state.regressionBookId && l.member_id === state.regressionMemberId
  );
  expect(matched, 'expected an active loan for the freshly issued book/member').toBeTruthy();
  state.regressionLoanId = matched!.id;

  const res = await request.post(`${envConfig.libraryBaseUrl}/api/loans/return`, {
    data: { loan_id: state.regressionLoanId },
  });
  state.lastResponseStatus = res.status();
  state.lastResponseBody = await res.json();
});

Then('the return request should succeed', async ({ state }) => {
  expect(state.lastResponseStatus).toBe(200);
});
