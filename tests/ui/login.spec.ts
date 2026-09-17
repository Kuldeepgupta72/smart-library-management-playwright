import { test, expect } from '../../src/fixtures/baseTest';

interface UserData {
    invalidUser: { email: string; password: string };
}

test.describe('Login functionality', () => {
    test('should show error for invalid credentials', async ({ dataLoader }) => {
        const { invalidUser } = dataLoader.load<UserData>('users.json');
    });

    test('test', async ({ homePage, cartPage }) => {
        await homePage.open();

        await homePage.addProductToCart(0);
        await homePage.continueShopping();

        await homePage.addProductToCart(5);
        await homePage.continueShopping();

        await homePage.goToCart();
        await cartPage.proceedToCheckout();
        await cartPage.continueOnCart();
    });

});
