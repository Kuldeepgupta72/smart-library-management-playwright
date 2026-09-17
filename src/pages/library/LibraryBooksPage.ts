import { Page, Locator, expect } from '@playwright/test';
import LibraryBasePage from './LibraryBasePage';
import { libraryBooksLocators } from '../locators/library/libraryBooksLocators';

export type AvailabilityFilterValue = '' | 'available' | 'not_available';
export type SortValue = 'title' | 'author';

export interface BookRow {
  title: string;
  author: string;
  isbn: string;
  status: string;
}

export default class LibraryBooksPage extends LibraryBasePage {
  private readonly titleInput: Locator;
  private readonly authorInput: Locator;
  private readonly isbnInput: Locator;
  private readonly addBookButton: Locator;
  private readonly errorMessage: Locator;
  private readonly availabilityFilter: Locator;
  private readonly sortSelect: Locator;
  private readonly resetFiltersButton: Locator;
  private readonly prevButton: Locator;
  private readonly nextButton: Locator;
  private readonly paginationLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.titleInput = this.page.locator(libraryBooksLocators.titleInput);
    this.authorInput = this.page.locator(libraryBooksLocators.authorInput);
    this.isbnInput = this.page.locator(libraryBooksLocators.isbnInput);
    this.addBookButton = this.page.locator(libraryBooksLocators.addBookButton);
    this.errorMessage = this.page.locator(libraryBooksLocators.errorMessage);
    this.availabilityFilter = this.page.locator(libraryBooksLocators.availabilityFilter);
    this.sortSelect = this.page.locator(libraryBooksLocators.sortSelect);
    this.resetFiltersButton = this.page.locator(libraryBooksLocators.resetFiltersButton);
    this.prevButton = this.page.locator(libraryBooksLocators.booksPrevButton);
    this.nextButton = this.page.locator(libraryBooksLocators.booksNextButton);
    this.paginationLabel = this.page.locator(libraryBooksLocators.booksPaginationLabel);
  }

  async open(): Promise<void> {
    await this.openTab(libraryBooksLocators.booksTab);
  }

  async addBook(title: string, author: string, isbn: string): Promise<void> {
    await this.fill(this.titleInput, title);
    await this.fill(this.authorInput, author);
    await this.fill(this.isbnInput, isbn);
    await this.click(this.addBookButton);
  }

  /**
   * Adds a book and waits for the POST to persist (the list re-fetch that
   * follows a successful add), without asserting the new row is visible
   * on the current page — useful when seeding enough books that later
   * additions get sorted onto page 2+ and would never appear on page 1.
   */
  async addBookAndWaitForPersist(title: string, author: string, isbn: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(res => res.url().includes('/api/books') && res.request().method() === 'POST' && res.ok()),
      this.addBook(title, author, isbn),
    ]);
  }

  async expectDuplicateIsbnError(): Promise<void> {
    await this.waitForELement(this.errorMessage);
    await expect(this.errorMessage).toHaveText('A book with this ISBN already exists.');
  }

  async expectBookAddedSuccessfully(isbn: string): Promise<void> {
    const bookRow = this.page.locator(libraryBooksLocators.booksListRows).filter({ hasText: isbn });
    await expect(bookRow).toBeVisible();
  }

  async countBookRows(isbn: string): Promise<number> {
    return this.page.locator(libraryBooksLocators.booksListRows).filter({ hasText: isbn }).count();
  }

  // ---- KAN-18: availability filter / sort / pagination / reset ----

  /**
   * Selects an Availability filter option and waits for the resulting
   * /api/books re-fetch to complete before returning, since the change
   * handler re-renders the table asynchronously with no debounce.
   */
  async filterByAvailability(value: AvailabilityFilterValue): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(res => res.url().includes('/api/books') && res.ok()),
      this.availabilityFilter.selectOption(value),
    ]);
  }

  async sortBy(value: SortValue): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(res => res.url().includes('/api/books') && res.ok()),
      this.sortSelect.selectOption(value),
    ]);
  }

  async resetFilters(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(res => res.url().includes('/api/books') && res.ok()),
      this.click(this.resetFiltersButton),
    ]);
  }

  async expectAvailabilityFilterValue(value: AvailabilityFilterValue): Promise<void> {
    await expect(this.availabilityFilter).toHaveValue(value);
  }

  async expectSortValue(value: SortValue): Promise<void> {
    await expect(this.sortSelect).toHaveValue(value);
  }

  /** Reads the visible rows on the current page only (no pagination). */
  async getCurrentPageRows(): Promise<BookRow[]> {
    const rows = this.page.locator(libraryBooksLocators.booksListRows);
    const count = await rows.count();
    const result: BookRow[] = [];
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      result.push({
        title: (await cells.nth(0).innerText()).trim(),
        author: (await cells.nth(1).innerText()).trim(),
        isbn: (await cells.nth(2).innerText()).trim(),
        status: (await cells.nth(3).innerText()).trim(),
      });
    }
    return result;
  }

  /**
   * Walks every page via the Next button (current filter/sort applied)
   * and returns all rows in rendered order. Used so assertions about a
   * handful of uniquely-named seeded books are immune to how many other
   * books/pages exist from other tests sharing the same backend data.
   *
   * Always rewinds to page 1 first via Prev, since a previous call (or
   * a manual Next click earlier in the scenario) may have left the view
   * on a later page — without rewinding, traversal would silently only
   * cover the remaining forward pages.
   */
  async collectAllRowsAcrossPages(): Promise<BookRow[]> {
    await this.rewindToFirstPage();

    const allRows: BookRow[] = [];
    // Guard against an unexpected infinite loop if Next never disables.
    for (let safety = 0; safety < 50; safety++) {
      allRows.push(...(await this.getCurrentPageRows()));
      const paginationVisible = await this.page.locator(libraryBooksLocators.booksPagination).isVisible();
      if (!paginationVisible) break;
      const nextDisabled = await this.nextButton.isDisabled().catch(() => true);
      if (nextDisabled) break;
      await Promise.all([
        this.page.waitForResponse(res => res.url().includes('/api/books') && res.ok()),
        this.nextButton.click(),
      ]);
    }
    return allRows;
  }

  private async rewindToFirstPage(): Promise<void> {
    for (let safety = 0; safety < 50; safety++) {
      const paginationVisible = await this.page.locator(libraryBooksLocators.booksPagination).isVisible();
      if (!paginationVisible) return;
      const prevDisabled = await this.prevButton.isDisabled().catch(() => true);
      if (prevDisabled) return;
      await Promise.all([
        this.page.waitForResponse(res => res.url().includes('/api/books') && res.ok()),
        this.prevButton.click(),
      ]);
    }
  }

  async clickNextPage(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(res => res.url().includes('/api/books') && res.ok()),
      this.nextButton.click(),
    ]);
  }

  async clickPrevPage(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(res => res.url().includes('/api/books') && res.ok()),
      this.prevButton.click(),
    ]);
  }

  async expectPrevButtonDisabled(): Promise<void> {
    await expect(this.prevButton).toBeDisabled();
  }

  async expectPrevButtonEnabled(): Promise<void> {
    await expect(this.prevButton).toBeEnabled();
  }

  async expectPaginationLabelContains(text: string): Promise<void> {
    await expect(this.paginationLabel).toContainText(text);
  }

  async getTotalPagesFromLabel(): Promise<number> {
    const text = await this.paginationLabel.innerText();
    const match = text.match(/Page \d+ of (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
