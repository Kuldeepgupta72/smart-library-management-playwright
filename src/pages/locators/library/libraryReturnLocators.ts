/**
 * Centralized selectors for the Library app's Return tab.
 * Verified against the running app at http://localhost:5050.
 * The loans table has no per-column classes, so the due-date cell is
 * addressed positionally: Book | Issued To | Issued Date | Due Date | Action.
 */
export const libraryReturnLocators = {
  returnTab: '.tab-btn[data-tab="return"]',
  loansList: '#loans-list',
  loansListRows: '#loans-list tbody tr',
  loanDueDateCell: 'td:nth-child(4)',
  returnButton: '.return-btn',
};
