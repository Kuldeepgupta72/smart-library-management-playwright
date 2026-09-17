import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './bddTest';
import type { AvailabilityFilterValue, SortValue, BookRow } from '../pages/library/LibraryBooksPage';

const { Given, When, Then } = createBdd(test);

interface Kan18TestData {
  kan18FilterSort: {
    availableBookTitle: string;
    availableBookAuthor: string;
    issuedBookTitle: string;
    issuedBookAuthor: string;
    issueMemberName: string;
    sortBookATitle: string;
    sortBookAAuthor: string;
    sortBookZTitle: string;
    sortBookZAuthor: string;
    paginationBookTitlePrefix: string;
  };
}

function toAvailabilityValue(label: string): AvailabilityFilterValue {
  if (label === 'Available') return 'available';
  if (label === 'Not available') return 'not_available';
  return '';
}

function toSortValue(label: string): SortValue {
  return label === 'Author (A-Z)' ? 'author' : 'title';
}

/** Case-insensitive ascending check, mirroring the app's SQLite COLLATE NOCASE sort. */
function isAscendingCaseInsensitive(values: string[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1].toLocaleLowerCase() > values[i].toLocaleLowerCase()) return false;
  }
  return true;
}

// ---- Availability filter + combined filter/sort ----

Given('an available book and an issued \\(not available\\) book exist in the library', async ({ libraryBooksPage, libraryMembersPage, libraryIssuePage, dataLoader, state }) => {
  const { kan18FilterSort } = dataLoader.load<Kan18TestData>('library-testdata.json');
  const ts = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  state.availableBookTitle = `${kan18FilterSort.availableBookTitle} ${ts}`;
  state.availableBookIsbn = `978AVAIL${ts}`;
  state.issuedBookTitle = `${kan18FilterSort.issuedBookTitle} ${ts}`;
  state.issuedBookIsbn = `978ISSUE${ts}`;

  await libraryBooksPage.open();
  await libraryBooksPage.addBookAndWaitForPersist(state.availableBookTitle, kan18FilterSort.availableBookAuthor, state.availableBookIsbn);
  await libraryBooksPage.addBookAndWaitForPersist(state.issuedBookTitle, kan18FilterSort.issuedBookAuthor, state.issuedBookIsbn);

  const memberName = `${kan18FilterSort.issueMemberName} ${ts}`;
  const memberEmail = `kan18.filter.${ts}@example.com`;
  await libraryMembersPage.open();
  await libraryMembersPage.addMember(memberName, memberEmail);
  await libraryMembersPage.expectMemberAddedSuccessfully(memberEmail);

  await libraryIssuePage.open();
  await libraryIssuePage.issueBook(state.issuedBookTitle, memberName);
  await libraryIssuePage.expectDueDateShown();
});

When('I filter the books list by availability {string}', async ({ libraryBooksPage }, label: string) => {
  await libraryBooksPage.open();
  await libraryBooksPage.filterByAvailability(toAvailabilityValue(label));
});

When('I filter the books list by availability {string} and sort by {string}', async ({ libraryBooksPage }, availabilityLabel: string, sortLabel: string) => {
  await libraryBooksPage.open();
  await libraryBooksPage.filterByAvailability(toAvailabilityValue(availabilityLabel));
  await libraryBooksPage.sortBy(toSortValue(sortLabel));
});

Then('only my available book should be shown and my issued book should not', async ({ libraryBooksPage, state }) => {
  const rows = await libraryBooksPage.collectAllRowsAcrossPages();
  const availableRow = rows.find(r => r.title === state.availableBookTitle);
  const issuedRow = rows.find(r => r.title === state.issuedBookTitle);
  expect(availableRow, 'expected the available book to be shown').toBeTruthy();
  expect(availableRow!.status).toBe('Available');
  expect(issuedRow, 'expected the issued book to be filtered out').toBeUndefined();
});

Then('only my issued book should be shown and my available book should not', async ({ libraryBooksPage, state }) => {
  const rows = await libraryBooksPage.collectAllRowsAcrossPages();
  const issuedRow = rows.find(r => r.title === state.issuedBookTitle);
  const availableRow = rows.find(r => r.title === state.availableBookTitle);
  expect(issuedRow, 'expected the issued (not available) book to be shown').toBeTruthy();
  expect(issuedRow!.status).toBe('Issued');
  expect(availableRow, 'expected the available book to be filtered out').toBeUndefined();
});

Then('both my available book and my issued book should be shown', async ({ libraryBooksPage, state }) => {
  const rows = await libraryBooksPage.collectAllRowsAcrossPages();
  expect(rows.some(r => r.title === state.availableBookTitle)).toBe(true);
  expect(rows.some(r => r.title === state.issuedBookTitle)).toBe(true);
});

Then('my available book should be correctly positioned in author ascending order', async ({ libraryBooksPage, state, dataLoader }) => {
  const { kan18FilterSort } = dataLoader.load<Kan18TestData>('library-testdata.json');
  const rows = await libraryBooksPage.collectAllRowsAcrossPages();
  // Since the issued book was filtered out, only real-app books that are
  // available remain; assert overall author ordering holds among them,
  // and that our own available book's author sits in its correct position
  // relative to any adjacent rows.
  const authors = rows.map(r => r.author);
  expect(isAscendingCaseInsensitive(authors)).toBe(true);
  expect(authors).toContain(kan18FilterSort.availableBookAuthor);
});

// ---- Sort by title / author ----

Given('two uniquely named books exist in the library for sort testing', async ({ libraryBooksPage, dataLoader, state }) => {
  const { kan18FilterSort } = dataLoader.load<Kan18TestData>('library-testdata.json');
  const ts = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  // Title "AAA..." paired with an author starting with "Z", and title
  // "ZZZ..." paired with a lowercase-starting author "a...": this way
  // title-sort and author-sort produce opposite relative orderings,
  // and the author pairing also exercises case-insensitive comparison.
  state.sortBookATitle = `${kan18FilterSort.sortBookATitle} ${ts}`;
  state.sortBookAAuthor = `${kan18FilterSort.sortBookAAuthor} ${ts}`;
  state.sortBookZTitle = `${kan18FilterSort.sortBookZTitle} ${ts}`;
  state.sortBookZAuthor = `${kan18FilterSort.sortBookZAuthor} ${ts}`;

  await libraryBooksPage.open();
  await libraryBooksPage.addBookAndWaitForPersist(state.sortBookATitle, state.sortBookAAuthor, `978SORTA${ts}`);
  await libraryBooksPage.addBookAndWaitForPersist(state.sortBookZTitle, state.sortBookZAuthor, `978SORTZ${ts}`);
});

When('I sort the books list by {string}', async ({ libraryBooksPage }, sortLabel: string) => {
  await libraryBooksPage.open();
  await libraryBooksPage.sortBy(toSortValue(sortLabel));
});

Then('my two books should appear in title ascending order', async ({ libraryBooksPage, state }) => {
  const rows = await libraryBooksPage.collectAllRowsAcrossPages();
  const indexA = rows.findIndex(r => r.title === state.sortBookATitle);
  const indexZ = rows.findIndex(r => r.title === state.sortBookZTitle);
  expect(indexA).toBeGreaterThanOrEqual(0);
  expect(indexZ).toBeGreaterThanOrEqual(0);
  expect(indexA).toBeLessThan(indexZ);
});

Then('my two books should appear in author ascending order case-insensitively', async ({ libraryBooksPage, state }) => {
  const rows = await libraryBooksPage.collectAllRowsAcrossPages();
  const indexOfZAuthorBook = rows.findIndex(r => r.title === state.sortBookZTitle); // lowercase "a..." author
  const indexOfAAuthorBook = rows.findIndex(r => r.title === state.sortBookATitle); // uppercase "Z..." author
  expect(indexOfZAuthorBook).toBeGreaterThanOrEqual(0);
  expect(indexOfAAuthorBook).toBeGreaterThanOrEqual(0);
  // Book with the lower author name ("a...") must come before the one
  // with the higher author name ("Z...") despite the case difference.
  expect(indexOfZAuthorBook).toBeLessThan(indexOfAAuthorBook);
});

// ---- Pagination ----

Given('at least 21 books exist in the library so results span multiple pages', async ({ libraryBooksPage, dataLoader, $testInfo }) => {
  $testInfo.setTimeout($testInfo.timeout + 60000);
  const { kan18FilterSort } = dataLoader.load<Kan18TestData>('library-testdata.json');
  const ts = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  await libraryBooksPage.open();
  // Default page size is 20; adding 21 unique books guarantees more than
  // one page regardless of how many other books already exist from
  // other tests sharing this backend/database.
  for (let i = 1; i <= 21; i++) {
    const isbn = `978PAGE${ts}${String(i).padStart(2, '0')}`;
    // Once more than 20 matching books exist, later additions may be
    // sorted onto page 2+ and would never be visible on page 1, so only
    // wait for the add to persist rather than asserting row visibility.
    await libraryBooksPage.addBookAndWaitForPersist(`${kan18FilterSort.paginationBookTitlePrefix} ${ts} ${String(i).padStart(2, '0')}`, 'Pagination Author', isbn);
  }
});

When('I open the books list', async ({ libraryBooksPage }) => {
  await libraryBooksPage.open();
});

Then('the pagination label should show page 1 of more than 1 page', async ({ libraryBooksPage }) => {
  await libraryBooksPage.expectPaginationLabelContains('Page 1 of');
  const totalPages = await libraryBooksPage.getTotalPagesFromLabel();
  expect(totalPages).toBeGreaterThan(1);
});

Then('the Previous page button should be disabled', async ({ libraryBooksPage }) => {
  await libraryBooksPage.expectPrevButtonDisabled();
});

Then('the Previous page button should be enabled', async ({ libraryBooksPage }) => {
  await libraryBooksPage.expectPrevButtonEnabled();
});

When('I click the Next page button', async ({ libraryBooksPage }) => {
  await libraryBooksPage.clickNextPage();
});

When('I click the Previous page button', async ({ libraryBooksPage }) => {
  await libraryBooksPage.clickPrevPage();
});

Then('the pagination label should show page 2', async ({ libraryBooksPage }) => {
  await libraryBooksPage.expectPaginationLabelContains('Page 2 of');
});

Then('the pagination label should show page 1', async ({ libraryBooksPage }) => {
  await libraryBooksPage.expectPaginationLabelContains('Page 1 of');
});

// ---- Reset Filters ----

Given('I have filtered the books list by availability {string} and sorted by {string}', async ({ libraryBooksPage }, availabilityLabel: string, sortLabel: string) => {
  await libraryBooksPage.open();
  await libraryBooksPage.filterByAvailability(toAvailabilityValue(availabilityLabel));
  await libraryBooksPage.sortBy(toSortValue(sortLabel));
});

When('I click the Reset Filters button', async ({ libraryBooksPage }) => {
  await libraryBooksPage.resetFilters();
});

Then('the availability filter should be reset to {string}', async ({ libraryBooksPage }, _label: string) => {
  await libraryBooksPage.expectAvailabilityFilterValue('');
});

Then('the sort should be reset to {string}', async ({ libraryBooksPage }, _label: string) => {
  await libraryBooksPage.expectSortValue('title');
});
