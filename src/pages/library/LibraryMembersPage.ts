import { Page, Locator, expect } from '@playwright/test';
import LibraryBasePage from './LibraryBasePage';
import { libraryMembersLocators } from '../locators/library/libraryMembersLocators';

export default class LibraryMembersPage extends LibraryBasePage {
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly addMemberButton: Locator;
  private readonly errorMessage: Locator;
  private readonly memberSearchInput: Locator;
  private readonly membersEmptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = this.page.locator(libraryMembersLocators.nameInput);
    this.emailInput = this.page.locator(libraryMembersLocators.emailInput);
    this.addMemberButton = this.page.locator(libraryMembersLocators.addMemberButton);
    this.errorMessage = this.page.locator(libraryMembersLocators.errorMessage);
    this.memberSearchInput = this.page.locator(libraryMembersLocators.memberSearchInput);
    this.membersEmptyState = this.page.locator(libraryMembersLocators.membersEmptyState);
  }

  async open(): Promise<void> {
    await this.openTab(libraryMembersLocators.membersTab);
  }

  async addMember(name: string, email: string): Promise<void> {
    await this.fill(this.nameInput, name);
    await this.fill(this.emailInput, email);
    await this.click(this.addMemberButton);
  }

  async expectInvalidEmailError(expectedMessage: string = 'Invalid email format.'): Promise<void> {
    await this.waitForELement(this.errorMessage);
    await expect(this.errorMessage).toHaveText(expectedMessage);
  }

  async expectMemberAddedSuccessfully(email: string): Promise<void> {
    const memberRow = this.page.locator(libraryMembersLocators.membersListRows).filter({ hasText: email });
    await expect(memberRow.first()).toBeVisible();
  }

  async countAllMemberRows(): Promise<number> {
    return this.page.locator(libraryMembersLocators.membersListRows).count();
  }

  async searchMembers(query: string): Promise<void> {
    await this.fill(this.memberSearchInput, query);
    // Wait for debounce (300ms) + DOM update
    await this.page.waitForTimeout(500);
  }

  async clearSearch(): Promise<void> {
    await this.memberSearchInput.clear();
    await this.page.waitForTimeout(500);
  }

  async expectMembersTableContains(text: string): Promise<void> {
    const matchingRow = this.page.locator(libraryMembersLocators.membersListRows).filter({ hasText: text });
    await expect(matchingRow.first()).toBeVisible();
  }

  async expectMembersTableNotContains(text: string): Promise<void> {
    const matchingRow = this.page.locator(libraryMembersLocators.membersListRows).filter({ hasText: text });
    await expect(matchingRow).toHaveCount(0);
  }

  async expectNoMembersFound(): Promise<void> {
    await expect(this.membersEmptyState).toBeVisible();
    await expect(this.membersEmptyState).toHaveText('No members found.');
  }
}
