/**
 * Centralized selectors for the Library app's Books tab.
 * Verified against the running app at http://localhost:5050.
 */
export const libraryBooksLocators = {
  booksTab: '.tab-btn[data-tab="books"]',
  titleInput: '#book-title',
  authorInput: '#book-author',
  isbnInput: '#book-isbn',
  addBookButton: '#add-book-form button[type="submit"]',
  errorMessage: '#book-error',
  booksList: '#books-list',
  booksListRows: '#books-list tbody tr',
  // KAN-18: filter/sort/pagination controls
  availabilityFilter: '#availability-filter',
  sortSelect: '#sort-select',
  resetFiltersButton: '#reset-filters-btn',
  booksPagination: '#books-pagination',
  booksPrevButton: '#books-prev-btn',
  booksNextButton: '#books-next-btn',
  booksPaginationLabel: '#books-pagination span',
  booksEmptyState: '#books-list p.empty',
};
