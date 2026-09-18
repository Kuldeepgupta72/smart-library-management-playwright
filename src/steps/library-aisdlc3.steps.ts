import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './bddTest';

const { Given, When, Then } = createBdd(test);

interface Aisdlc3TestData {
  aisdlc3Pagination: {
    memberNamePrefix: string;
    newMemberNamePrefix: string;
  };
}

interface MemberApiEntry {
  id: number;
  name: string;
  email: string;
  [key: string]: unknown;
}

interface MembersListResponse {
  members: MemberApiEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BookApiEntry {
  id: number;
  title: string;
  author: string;
  isbn: string;
  is_available: number;
  [key: string]: unknown;
}

interface BooksListResponse {
  books: BookApiEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * AISDLC-3 — Add pagination to GET /api/members. This story is backend-only
 * (no member-facing pagination UI per requirements "Out of Scope"), so
 * scenarios call GET /api/members, GET /api/members/search, POST /api/members
 * and GET /api/books (regression) directly via Playwright's `request`
 * fixture against envConfig.libraryBaseUrl, instead of driving a page
 * object — the same pattern as AISDLC-2 (library-aisdlc2.steps.ts).
 */

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

// ---- Seeding ----

Given('at least one member exists in the library', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc3Pagination } = dataLoader.load<Aisdlc3TestData>('library-testdata.json');
  const ts = uniqueSuffix();
  const name = `${aisdlc3Pagination.memberNamePrefix} ${ts}`;
  const email = `aisdlc3.pag.${ts}@example.com`;
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/members`, {
    data: { name, email },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as MemberApiEntry;
  state.pagMemberId = body.id;
  state.pagMemberName = name;
  state.pagMemberEmail = email;
});

Given('a uniquely identifiable member has just been added', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc3Pagination } = dataLoader.load<Aisdlc3TestData>('library-testdata.json');
  const ts = uniqueSuffix();
  const name = `${aisdlc3Pagination.memberNamePrefix} ${ts}`;
  const email = `aisdlc3.unique.${ts}@example.com`;
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/members`, {
    data: { name, email },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as MemberApiEntry;
  state.pagMemberId = body.id;
  state.pagMemberName = name;
  state.pagMemberEmail = email;
});

// ---- GET /api/members ----

When('I request the members list with default pagination', async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/members`);
  state.lastResponseStatus = res.status();
  state.lastMembersResponse = (await res.json()) as MembersListResponse;
});

When(
  'I request the members list with pageSize {int} for the page containing that member',
  async ({ request, envConfig, state }, pageSize: number) => {
    // The member was just created, so with ORDER BY id ASC it is at (or
    // beyond) the end of the full unfiltered list. Use the just-created
    // member's own id together with a baseline default-pagination call's
    // `total` to compute which page it must land on, since /api/members
    // has no way to filter/search by id directly.
    const baselineRes = await request.get(`${envConfig.libraryBaseUrl}/api/members`);
    expect(baselineRes.ok()).toBe(true);
    const baseline = (await baselineRes.json()) as MembersListResponse;
    const expectedPage = Math.max(1, Math.ceil(baseline.total / pageSize));
    state.pagRequestedPageSize = pageSize;
    state.pagExpectedPage = expectedPage;

    const res = await request.get(
      `${envConfig.libraryBaseUrl}/api/members?page=${expectedPage}&pageSize=${pageSize}`
    );
    state.lastResponseStatus = res.status();
    state.lastMembersResponse = (await res.json()) as MembersListResponse;
  }
);

When(
  'I request the members list with page {int} and pageSize {int}',
  async ({ request, envConfig, state }, page: number, pageSize: number) => {
    const res = await request.get(
      `${envConfig.libraryBaseUrl}/api/members?page=${page}&pageSize=${pageSize}`
    );
    state.lastResponseStatus = res.status();
    state.lastMembersResponse = (await res.json()) as MembersListResponse;
  }
);

When(
  'I request the members list with page {string} and pageSize {string}',
  async ({ request, envConfig, state }, page: string, pageSize: string) => {
    const params = new URLSearchParams();
    if (page !== '') params.set('page', page);
    if (pageSize !== '') params.set('pageSize', pageSize);
    const query = params.toString();
    const res = await request.get(
      `${envConfig.libraryBaseUrl}/api/members${query ? `?${query}` : ''}`
    );
    state.lastResponseStatus = res.status();
    state.lastMembersResponse = (await res.json()) as MembersListResponse;
  }
);

Then('the members response should echo page {int} and pageSize {int}', async ({ state }, page: number, pageSize: number) => {
  const body = state.lastMembersResponse as MembersListResponse;
  expect(body.page).toBe(page);
  expect(body.pageSize).toBe(pageSize);
});

Then('the members response should echo the requested page and pageSize {int}', async ({ state }, pageSize: number) => {
  const body = state.lastMembersResponse as MembersListResponse;
  expect(body.page).toBe(state.pagExpectedPage);
  expect(body.pageSize).toBe(pageSize);
});

Then('the members response should echo pageSize {int}', async ({ state }, pageSize: number) => {
  const body = state.lastMembersResponse as MembersListResponse;
  expect(body.pageSize).toBe(pageSize);
});

Then('the members response should contain at most {int} members', async ({ state }, maxCount: number) => {
  const body = state.lastMembersResponse as MembersListResponse;
  expect(body.members.length).toBeLessThanOrEqual(maxCount);
});

Then('the members response total and totalPages should be consistent', async ({ state }) => {
  const body = state.lastMembersResponse as MembersListResponse;
  expect(typeof body.total).toBe('number');
  expect(body.total).toBeGreaterThanOrEqual(1);
  const expectedTotalPages = body.total === 0 ? 0 : Math.ceil(body.total / body.pageSize);
  expect(body.totalPages).toBe(expectedTotalPages);
});

Then('the members request should not fail', async ({ state }) => {
  expect(state.lastResponseStatus).toBe(200);
});

Then('that member should appear in the returned members list', async ({ state }) => {
  const body = state.lastMembersResponse as MembersListResponse;
  const found = body.members.find((m) => m.id === state.pagMemberId);
  expect(found, `expected member id ${state.pagMemberId} to be present in the returned page`).toBeTruthy();
  expect(found!.name).toBe(state.pagMemberName);
  expect(found!.email).toBe(state.pagMemberEmail);
});

Then('each member in the members response should contain only id, name and email fields', async ({ state }) => {
  const body = state.lastMembersResponse as MembersListResponse;
  expect(body.members.length).toBeGreaterThan(0);
  for (const member of body.members) {
    expect(Object.keys(member).sort()).toEqual(['email', 'id', 'name']);
  }
});

// ---- GET /api/members/search ----

When('I search for that member by name', async ({ request, envConfig, state }) => {
  const res = await request.get(
    `${envConfig.libraryBaseUrl}/api/members/search?q=${encodeURIComponent(state.pagMemberName!)}`
  );
  state.lastResponseStatus = res.status();
  state.lastSearchResponse = await res.json();
});

Then('the search response should be a flat array of members, not a paginated envelope', async ({ state }) => {
  expect(state.lastResponseStatus).toBe(200);
  expect(Array.isArray(state.lastSearchResponse)).toBe(true);
});

Then('that member should appear in the search results', async ({ state }) => {
  const results = state.lastSearchResponse as MemberApiEntry[];
  const found = results.find((m) => m.id === state.pagMemberId);
  expect(found, `expected member id ${state.pagMemberId} to be present in the search results`).toBeTruthy();
});

// ---- POST /api/members ----

When('I create a new member with a unique name and email', async ({ request, envConfig, dataLoader, state }) => {
  const { aisdlc3Pagination } = dataLoader.load<Aisdlc3TestData>('library-testdata.json');
  const ts = uniqueSuffix();
  const name = `${aisdlc3Pagination.newMemberNamePrefix} ${ts}`;
  const email = `aisdlc3.create.${ts}@example.com`;
  state.pagMemberName = name;
  state.pagMemberEmail = email;
  const res = await request.post(`${envConfig.libraryBaseUrl}/api/members`, {
    data: { name, email },
  });
  state.lastResponseStatus = res.status();
  state.lastResponseBody = await res.json();
});

Then('the create member request should return status {int}', async ({ state }, status: number) => {
  expect(state.lastResponseStatus).toBe(status);
});

Then("the response should contain the new member's id, name and email", async ({ state }) => {
  const body = state.lastResponseBody as MemberApiEntry;
  expect(typeof body.id).toBe('number');
  expect(body.name).toBe(state.pagMemberName);
  expect(body.email).toBe(state.pagMemberEmail);
});

// ---- GET /api/books (regression) ----

When('I request the books list with default pagination', async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/books`);
  state.lastResponseStatus = res.status();
  state.lastBooksResponse = (await res.json()) as BooksListResponse;
});

When('I request the books list with pageSize {int}', async ({ request, envConfig, state }, pageSize: number) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/books?pageSize=${pageSize}`);
  state.lastResponseStatus = res.status();
  state.lastBooksResponse = (await res.json()) as BooksListResponse;
});

When('I request the books list sorted by author', async ({ request, envConfig, state }) => {
  const res = await request.get(`${envConfig.libraryBaseUrl}/api/books?sort=author&pageSize=100`);
  state.lastResponseStatus = res.status();
  state.lastBooksResponse = (await res.json()) as BooksListResponse;
});

When(
  'I request the books list filtered by availability {string}',
  async ({ request, envConfig, state }, availability: string) => {
    const res = await request.get(
      `${envConfig.libraryBaseUrl}/api/books?availability=${availability}&pageSize=100`
    );
    state.lastResponseStatus = res.status();
    state.lastBooksResponse = (await res.json()) as BooksListResponse;
  }
);

Then('the books response should echo page {int} and pageSize {int}', async ({ state }, page: number, pageSize: number) => {
  const body = state.lastBooksResponse as BooksListResponse;
  expect(body.page).toBe(page);
  expect(body.pageSize).toBe(pageSize);
});

Then('the books response should echo pageSize {int}', async ({ state }, pageSize: number) => {
  const body = state.lastBooksResponse as BooksListResponse;
  expect(body.pageSize).toBe(pageSize);
});

Then('the books response should contain page, pageSize, total and totalPages fields', async ({ state }) => {
  const body = state.lastBooksResponse as BooksListResponse;
  expect(typeof body.page).toBe('number');
  expect(typeof body.pageSize).toBe('number');
  expect(typeof body.total).toBe('number');
  expect(typeof body.totalPages).toBe('number');
});

Then('the returned books should be ordered by author ascending', async ({ state }) => {
  const body = state.lastBooksResponse as BooksListResponse;
  const authors = body.books.map((b) => b.author.toLocaleLowerCase());
  for (let i = 1; i < authors.length; i++) {
    expect(authors[i - 1] <= authors[i]).toBe(true);
  }
});

Then('all returned books in the response should be marked as available', async ({ state }) => {
  const body = state.lastBooksResponse as BooksListResponse;
  for (const book of body.books) {
    expect(book.is_available).toBe(1);
  }
});
