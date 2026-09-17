/**
 * Centralized selectors for the Login/Signup page.
 * Kept separate from LoginPage.ts so the page class stays focused on
 * behavior, not element lookup — same separation used in the reference
 * framework's src/pages/{page}/locators files.
 */
export const loginLocators = {
  loginEmailInput: '[data-qa="login-email"]',
  loginPasswordInput: '[data-qa="login-password"]',
  loginButton: '[data-qa="login-button"]',
  loginErrorText: 'p:has-text("Your email or password is incorrect!")',

  signupNameInput: '[data-qa="signup-name"]',
  signupEmailInput: '[data-qa="signup-email"]',
  signupButton: '[data-qa="signup-button"]',
};
