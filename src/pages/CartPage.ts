import { Locator, Page } from '@playwright/test';
import BasePage from './BasePage';
import { cartLocators } from './locators/cartLocators';

export default class CartPage extends BasePage {
    private readonly proceedToCheckoutButton: Locator;
    private readonly continueOnCartButton: Locator;

    constructor(page: Page) {
        super(page);
        this.proceedToCheckoutButton = this.page.locator(cartLocators.proceedToCheckoutButton);
        this.continueOnCartButton = this.page.locator(cartLocators.continueOnCartButton);
    }

    async proceedToCheckout(): Promise<void> {
        await this.click(this.proceedToCheckoutButton);
    }

    async continueOnCart(): Promise<void> {
        await this.click(this.continueOnCartButton);
    }
}
