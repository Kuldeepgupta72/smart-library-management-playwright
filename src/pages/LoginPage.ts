import { Page, Locator, expect } from '@playwright/test';
import BasePage from './BasePage';
import { loginLocators } from './locators/loginLocators';

export default class LoginPage extends BasePage {
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly loginErrorText: Locator;

  readonly signupNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupButton: Locator;

  constructor(page: Page) {
    super(page);
    this.loginEmailInput = page.locator(loginLocators.loginEmailInput);
    this.loginPasswordInput = page.locator(loginLocators.loginPasswordInput);
    this.loginButton = page.locator(loginLocators.loginButton);
    this.loginErrorText = page.locator(loginLocators.loginErrorText);

    this.signupNameInput = page.locator(loginLocators.signupNameInput);
    this.signupEmailInput = page.locator(loginLocators.signupEmailInput);
    this.signupButton = page.locator(loginLocators.signupButton);
  }

  async goto(): Promise<void> {
    await this.navigate('/login');
    await this.dismissOverlaysIfPresent();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.loginEmailInput, email);
    await this.fill(this.loginPasswordInput, password);
    await this.click(this.loginButton);
  }

  async expectLoginError(): Promise<void> {
    await expect(this.loginErrorText).toBeVisible();
  }

  async expectLoggedInAs(username: string): Promise<void> {
    await expect(this.page.locator(`a:has-text("Logged in as ${username}")`)).toBeVisible();
  }
}
