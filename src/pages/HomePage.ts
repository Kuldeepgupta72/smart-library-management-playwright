import { Locator, Page } from '@playwright/test';
import BasePage from './BasePage';
import { homeLocators } from './locators/homeLocators';

export default class HomePage extends BasePage {
    private readonly cartLink: Locator;
    private readonly continueShoppingButton: Locator;

    constructor(page: Page) {
        super(page);
        this.cartLink = this.page.locator(homeLocators.cartLink);
        this.continueShoppingButton = this.page.locator(homeLocators.continueShoppingButton);
    }

    async open(): Promise<void> {
        await this.navigate('/');
    }

    private productCard(index: number): Locator {
        return this.page.locator(homeLocators.productCard).nth(index);
    }

    async addProductToCart(index: number): Promise<void> {
        await this.click(this.productCard(index).locator(homeLocators.addToCartInProduct));
    }

    async continueShopping(): Promise<void> {
        await this.click(this.continueShoppingButton);
    }

    async goToCart(): Promise<void> {
        await this.click(this.cartLink);
    }
}
