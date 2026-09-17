/**
 * Centralized selectors for the Home / product-listing page.
 * Kept separate from HomePage.ts so the page class stays focused on
 * behavior, not element lookup — same separation used for loginLocators.
 */
export const homeLocators = {
  productCard: '.product-image-wrapper',
  addToCartInProduct: '.productinfo .add-to-cart',
  continueShoppingButton: 'button.close-modal',
  cartLink: '.navbar-nav a[href="/view_cart"]',
};
