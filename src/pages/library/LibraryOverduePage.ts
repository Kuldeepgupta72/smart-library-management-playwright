import { Page, Locator, expect } from '@playwright/test';
import LibraryBasePage from './LibraryBasePage';
import { libraryOverdueLocators } from '../locators/library/libraryOverdueLocators';

export interface OverdueLoanRow {
  memberName: string;
  memberEmail: string;
  bookTitle: string;
  isbn: string;
  issuedDate: string;
  dueDate: string;
  daysOverdue: string;
}

export default class LibraryOverduePage extends LibraryBasePage {
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.emptyState = this.page.locator(libraryOverdueLocators.overdueEmptyState);
  }

  async open(): Promise<void> {
    await this.openTab(libraryOverdueLocators.overdueTab);
  }

  /** Reads every row currently rendered in the Overdue Loans table (no pagination on this view). */
  async getRows(): Promise<OverdueLoanRow[]> {
    const rows = this.page.locator(libraryOverdueLocators.overdueListRows);
    const count = await rows.count();
    const result: OverdueLoanRow[] = [];
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      result.push({
        memberName: (await cells.nth(0).innerText()).trim(),
        memberEmail: (await cells.nth(1).innerText()).trim(),
        bookTitle: (await cells.nth(2).innerText()).trim(),
        isbn: (await cells.nth(3).innerText()).trim(),
        issuedDate: (await cells.nth(4).innerText()).trim(),
        dueDate: (await cells.nth(5).innerText()).trim(),
        daysOverdue: (await cells.nth(6).innerText()).trim(),
      });
    }
    return result;
  }

  async findRowByIsbn(isbn: string): Promise<OverdueLoanRow | undefined> {
    const rows = await this.getRows();
    return rows.find(r => r.isbn === isbn);
  }

  async expectEmptyState(expectedMessage: string = 'No overdue loans right now.'): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(this.emptyState).toHaveText(expectedMessage);
  }

  async expectNoRows(): Promise<void> {
    await expect(this.page.locator(libraryOverdueLocators.overdueListRows)).toHaveCount(0);
  }
}
