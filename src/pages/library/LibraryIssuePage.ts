import { Page, Locator, expect } from '@playwright/test';
import LibraryBasePage from './LibraryBasePage';
import { libraryIssueLocators } from '../locators/library/libraryIssueLocators';

export default class LibraryIssuePage extends LibraryBasePage {
  private readonly bookSelect: Locator;
  private readonly memberSelect: Locator;
  private readonly issueButton: Locator;
  private readonly dueDateDisplay: Locator;

  constructor(page: Page) {
    super(page);
    this.bookSelect = this.page.locator(libraryIssueLocators.bookSelect);
    this.memberSelect = this.page.locator(libraryIssueLocators.memberSelect);
    this.issueButton = this.page.locator(libraryIssueLocators.issueButton);
    this.dueDateDisplay = this.page.locator(libraryIssueLocators.dueDateDisplay);
  }

  async open(): Promise<void> {
    await this.openTab(libraryIssueLocators.issueTab);
  }

  async issueBook(bookTitle: string, memberName: string): Promise<void> {
    // Options are rendered as "<title> — <author>", so an exact label
    // match on the title alone won't hit; match by substring instead.
    const bookOption = this.page.locator(libraryIssueLocators.bookSelectOptions, { hasText: bookTitle });
    const bookValue = await bookOption.getAttribute('value');
    await this.bookSelect.selectOption(bookValue!);
    await this.memberSelect.selectOption({ label: memberName });
    await this.click(this.issueButton);
  }

  async expectDueDateShown(expectedDueDate?: string): Promise<void> {
    await this.waitForELement(this.dueDateDisplay);
    if (expectedDueDate) {
      await expect(this.dueDateDisplay).toContainText(expectedDueDate);
    } else {
      await expect(this.dueDateDisplay).toBeVisible();
    }
  }
}
