/**
 * Centralized selectors for the Library app's Overdue Loans tab (KAN-7).
 * Verified against the running app at http://localhost:5050
 * (src/client/app.ts renderOverdueLoans(), src/routes/loans.ts
 * GET /api/loans/overdue in the app repo).
 *
 * The table has no per-column classes; columns are positional:
 * Member | Email | Book | ISBN | Issued | Due | Days Overdue.
 * Empty state is rendered as `<p class="empty">No overdue loans right
 * now.</p>` inside the same container, matching the pattern already used
 * for Books/Members empty states.
 */
export const libraryOverdueLocators = {
  overdueTab: '.tab-btn[data-tab="overdue"]',
  overdueList: '#overdue-loans-list',
  overdueListRows: '#overdue-loans-list tbody tr',
  overdueEmptyState: '#overdue-loans-list p.empty',
};
