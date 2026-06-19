const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

describe('Login E2E Test', function() {
  this.timeout(30000); // 30 seconds timeout
  let driver;

  before(async function() {
    driver = await new Builder().forBrowser('chrome').build();
  });

  after(async function() {
    if (driver) {
      await driver.quit();
    }
  });

  it('should login with valid credentials and redirect to dashboard', async function() {
    // Navigate to the local dev server or live app
    await driver.get('http://localhost:3000');

    // Wait for the login form to load
    await driver.wait(until.elementLocated(By.id('email')), 10000);

    // Find elements using the stable IDs we added
    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));
    const loginButton = await driver.findElement(By.id('login-button'));

    // Enter credentials
    await emailInput.sendKeys('test@example.com');
    await passwordInput.sendKeys('password123');

    // Click login
    await loginButton.click();

    // Wait for redirect to dashboard
    await driver.wait(until.urlContains('/dashboard'), 10000);
    
    // Verify current URL
    const currentUrl = await driver.getCurrentUrl();
    assert.ok(currentUrl.includes('/dashboard'), 'Failed to redirect to dashboard');
  });
});
