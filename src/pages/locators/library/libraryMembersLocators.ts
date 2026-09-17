/**
 * Centralized selectors for the Library app's Members tab.
 * Verified against the running app at http://localhost:5050.
 */
export const libraryMembersLocators = {
  membersTab: '.tab-btn[data-tab="members"]',
  nameInput: '#member-name',
  emailInput: '#member-email',
  addMemberButton: '#add-member-form button[type="submit"]',
  errorMessage: '#member-error',
  membersList: '#members-list',
  membersListRows: '#members-list tbody tr',
  memberSearchInput: '#member-search',
  membersEmptyState: '#members-list p.empty',
};
