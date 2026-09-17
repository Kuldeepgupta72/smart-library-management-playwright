import { Page } from '@playwright/test';
import BasePage from '../BasePage';
import { envConfig } from '../../config/ConfigManager';

/**
 * Shared behavior for the Library Management System's page objects.
 * The app is a single-page, tab-based UI, so "opening" a section means
 * navigating to the app root (once) and switching to the relevant tab —
 * this helper centralizes that so each Library page object doesn't repeat it.
 */
export default abstract class LibraryBasePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  protected async openTab(tabSelector: string): Promise<void> {
    await this.navigate(envConfig.libraryBaseUrl);
    await this.click(this.page.locator(tabSelector));
  }
}
