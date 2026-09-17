/**
 * Centralized selectors for the Library app's Issue tab.
 * Verified against the running app at http://localhost:5050.
 * Note: there is no dedicated due-date element — the due date is shown
 * in the shared #message-banner after a successful issue
 * ("Book issued successfully. Due date: YYYY-MM-DD").
 */
export const libraryIssueLocators = {
  issueTab: '.tab-btn[data-tab="issue"]',
  bookSelect: '#issue-book-select',
  bookSelectOptions: '#issue-book-select option',
  memberSelect: '#issue-member-select',
  issueButton: '#issue-form button[type="submit"]',
  dueDateDisplay: '#message-banner',
};
