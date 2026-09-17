import { Page, Locator, expect } from '@playwright/test';
import LibraryBasePage from './LibraryBasePage';
import { libraryReturnLocators } from '../locators/library/libraryReturnLocators';

export default class LibraryReturnPage extends LibraryBasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.openTab(libraryReturnLocators.returnTab);
  }

  async expectDueDateInLoansList(bookTitle: string, expectedDueDate: string): Promise<void> {
    const loanRow = this.page.locator(libraryReturnLocators.loansListRows).filter({ hasText: bookTitle });
    await expect(loanRow.locator(libraryReturnLocators.loanDueDateCell)).toContainText(expectedDueDate);
  }
}
