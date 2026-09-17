/**
 * Centralized selectors for the Cart page.
 * Kept separate from CartPage.ts so the page class stays focused on
 * behavior, not element lookup — same separation used for loginLocators.
 */
export const cartLocators = {
  proceedToCheckoutButton: 'text=Proceed To Checkout',
  continueOnCartButton: 'button:has-text("Continue On Cart")',
};
