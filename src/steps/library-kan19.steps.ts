import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './bddTest';

const { Given, When, Then } = createBdd(test);

// Two distinct members are seeded so search can filter one in / one out
Given('two members exist in the library for search testing', async ({ libraryMembersPage, state }) => {
  const ts = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  state.searchMemberName = `Alice Search${ts}`;
  state.searchMemberEmail = `alice.search${ts}@example.com`;
  state.otherMemberName = `Bob Other${ts}`;
  state.otherMemberEmail = `bob.other${ts}@example.com`;

  await libraryMembersPage.open();
  await libraryMembersPage.addMember(state.searchMemberName, state.searchMemberEmail);
  await libraryMembersPage.expectMemberAddedSuccessfully(state.searchMemberEmail);

  await libraryMembersPage.addMember(state.otherMemberName, state.otherMemberEmail);
  await libraryMembersPage.expectMemberAddedSuccessfully(state.otherMemberEmail);
});

When('I type a partial name into the member search box', async ({ libraryMembersPage, state }) => {
  // Use "Alice Search" prefix — unique enough to match only the first member
  state.searchTerm = 'Alice Search';
  await libraryMembersPage.searchMembers(state.searchTerm);
});

Then('only members whose name contains that term should be shown', async ({ libraryMembersPage, state }) => {
  await libraryMembersPage.expectMembersTableContains(state.searchMemberName!);
});

Then('members that do not match should not be shown', async ({ libraryMembersPage, state }) => {
  await libraryMembersPage.expectMembersTableNotContains(state.otherMemberName!);
});

When('I type a partial email into the member search box', async ({ libraryMembersPage, state }) => {
  // Use the unique email prefix of the search member
  state.searchTerm = state.searchMemberEmail!.split('@')[0];
  await libraryMembersPage.searchMembers(state.searchTerm);
});

Then('only members whose email contains that term should be shown', async ({ libraryMembersPage, state }) => {
  await libraryMembersPage.expectMembersTableContains(state.searchMemberEmail!);
  await libraryMembersPage.expectMembersTableNotContains(state.otherMemberEmail!);
});

When('I type a search term that matches no member', async ({ libraryMembersPage, state }) => {
  state.searchTerm = 'ZZZNOMATCHZZZ';
  await libraryMembersPage.searchMembers(state.searchTerm);
});

Then('I should see the {string} message', async ({ libraryMembersPage }, message: string) => {
  if (message === 'No members found.') {
    await libraryMembersPage.expectNoMembersFound();
  }
});

Given('I have searched for a member by name', async ({ libraryMembersPage, state }) => {
  state.searchTerm = 'Alice Search';
  await libraryMembersPage.searchMembers(state.searchTerm);
  await libraryMembersPage.expectMembersTableContains(state.searchMemberName!);
});

When('I clear the member search box', async ({ libraryMembersPage }) => {
  await libraryMembersPage.clearSearch();
});

Then('all members should be visible again', async ({ libraryMembersPage, state }) => {
  await libraryMembersPage.expectMembersTableContains(state.searchMemberName!);
  await libraryMembersPage.expectMembersTableContains(state.otherMemberName!);
});
