import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './bddTest';

const { Given, When, Then } = createBdd(test);

interface LibraryTestData {
  validBook: { title: string; author: string; isbn: string };
  duplicateIsbnBook: { title: string; author: string; isbn: string };
  validMember: { name: string; email: string };
  invalidEmails: { case: string; email: string }[];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

Given('a unique book with a unique ISBN exists in the library', async ({ libraryBooksPage, dataLoader, state }) => {
  const { validBook } = dataLoader.load<LibraryTestData>('library-testdata.json');
  const uniqueIsbn = `${validBook.isbn}-${Date.now()}`;
  state.isbn = uniqueIsbn;
  state.bookTitle = `${validBook.title} ${Date.now()}`;
  await libraryBooksPage.open();
  await libraryBooksPage.addBook(state.bookTitle, validBook.author, uniqueIsbn);
  // Wait for the add to actually persist (list re-fetch on success) before
  // any later step tries to act on it — e.g. a duplicate-ISBN add racing
  // ahead of this one would see no existing row yet and wrongly succeed.
  await libraryBooksPage.expectBookAddedSuccessfully(uniqueIsbn);
});

Given('a member exists in the library', async ({ libraryMembersPage, dataLoader, state }) => {
  const { validMember } = dataLoader.load<LibraryTestData>('library-testdata.json');
  const uniqueEmail = `member.${Date.now()}@example.com`;
  state.memberName = validMember.name;
  state.memberEmail = uniqueEmail;
  await libraryMembersPage.open();
  await libraryMembersPage.addMember(validMember.name, uniqueEmail);
  // Wait for the member to actually persist before a later step (e.g.
  // issuing a book) navigates away and re-fetches the members dropdown.
  await libraryMembersPage.expectMemberAddedSuccessfully(uniqueEmail);
});

When('I issue the book to the member', async ({ libraryIssuePage, state }) => {
  await libraryIssuePage.open();
  await libraryIssuePage.issueBook(state.bookTitle!, state.memberName!);
});

Then('the due date should be shown as 14 days after today', async ({ libraryIssuePage }) => {
  const expectedDueDate = toIsoDate(addDays(new Date(), 14));
  await libraryIssuePage.expectDueDateShown(expectedDueDate);
});

When('I open the return tab', async ({ libraryReturnPage }) => {
  await libraryReturnPage.open();
});

Then('the loans list should show the due date as 14 days after today for that book', async ({ libraryReturnPage, state }) => {
  const expectedDueDate = toIsoDate(addDays(new Date(), 14));
  await libraryReturnPage.expectDueDateInLoansList(state.bookTitle!, expectedDueDate);
});

When('I add a book with the same ISBN again', async ({ libraryBooksPage, dataLoader, state }) => {
  const { validBook } = dataLoader.load<LibraryTestData>('library-testdata.json');
  await libraryBooksPage.addBook(validBook.title, validBook.author, state.isbn!);
});

When('I add a new book with a unique ISBN', async ({ libraryBooksPage, dataLoader, state }) => {
  const { validBook } = dataLoader.load<LibraryTestData>('library-testdata.json');
  const uniqueIsbn = `${validBook.isbn}-${Date.now()}-new`;
  state.isbn = uniqueIsbn;
  await libraryBooksPage.open();
  await libraryBooksPage.addBook(`${validBook.title} New`, validBook.author, uniqueIsbn);
});

Then('the book should be added successfully', async ({ libraryBooksPage, state }) => {
  await libraryBooksPage.expectBookAddedSuccessfully(state.isbn!);
});

Then('the book should not be added again', async ({ libraryBooksPage, state }) => {
  expect(await libraryBooksPage.countBookRows(state.isbn!)).toBe(1);
});

When('I add a member with email {string}', async ({ libraryMembersPage, dataLoader, state }, email: string) => {
  const { validMember } = dataLoader.load<LibraryTestData>('library-testdata.json');
  // "<blank>" is a table sentinel for a whitespace-only value: the email
  // input is a required field, so a truly empty string never reaches the
  // app's own validation (the browser blocks the submit before it fires).
  const actualEmail = email === '<blank>' ? ' ' : email;
  state.memberEmail = actualEmail;
  await libraryMembersPage.open();
  state.memberRowCountBefore = await libraryMembersPage.countAllMemberRows();
  await libraryMembersPage.addMember(validMember.name, actualEmail);
});

When('I add a new member with a valid email', async ({ libraryMembersPage, dataLoader, state }) => {
  const { validMember } = dataLoader.load<LibraryTestData>('library-testdata.json');
  const uniqueEmail = `new.${Date.now()}@example.com`;
  state.memberEmail = uniqueEmail;
  await libraryMembersPage.open();
  await libraryMembersPage.addMember(validMember.name, uniqueEmail);
});

Then('the member should be added successfully', async ({ libraryMembersPage, state }) => {
  await libraryMembersPage.expectMemberAddedSuccessfully(state.memberEmail!);
});

Then('the member should not be added', async ({ libraryMembersPage, state }) => {
  expect(await libraryMembersPage.countAllMemberRows()).toBe(state.memberRowCountBefore);
});

// A single generic error step is reused across the duplicate-ISBN and
// invalid-email scenarios (both assert "I should see the error \"...\"").
// Dispatch to the matching page object by inspecting the expected message,
// since the feature file doesn't otherwise say which form triggered it.
Then('I should see the error {string}', async ({ libraryBooksPage, libraryMembersPage }, message: string) => {
  if (message.toLowerCase().includes('isbn')) {
    await libraryBooksPage.expectDuplicateIsbnError();
  } else {
    await libraryMembersPage.expectInvalidEmailError(message);
  }
});
