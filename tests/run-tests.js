const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const E2E_TOKEN = 'sevatrack-e2e-secret-key-123';
const OUTPUT_FILE = path.join(__dirname, 'test-results.xlsx');

// Global test results logger
const testResults = [];

function logResult(name, mode, status, duration, error = '') {
  testResults.push({
    'Test Case Name': name,
    'Mode': mode.toUpperCase(),
    'Status': status,
    'Duration (ms)': Math.round(duration),
    'Timestamp': new Date().toLocaleString(),
    'Error Details': error ? error.toString().replace(/\n/g, ' ') : ''
  });
}

// Utility to create a driver instance
async function createDriver(mode) {
  let options = new chrome.Options();
  
  // Set chrome to run in headless mode for server/sandbox environment compatibility
  options.addArguments('--headless=new');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1280,800');

  if (mode === 'mobile') {
    console.log('Initializing Chrome with Mobile Emulation (Pixel 5)...');
    options.addExperimentalOption('mobileEmulation', { deviceName: 'Pixel 5' });
  } else {
    console.log('Initializing Chrome for Desktop Web...');
  }

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  return driver;
}

// Helper to navigate via the responsive sidebar
async function navigateTo(driver, mode, linkText, pathPart) {
  console.log(`[Navigation] Going to ${linkText} (${pathPart})...`);
  if (mode === 'mobile') {
    // In mobile view, we need to click the hamburger icon to open the Sidebar drawer
    // The drawer toggle is inside the div.lg:hidden header
    const menuBtn = await driver.wait(
      until.elementLocated(By.css('div.lg\\:hidden button')), 
      5000,
      'Could not find mobile hamburger menu button'
    );
    await menuBtn.click();
    await driver.sleep(500); // Wait for sidebar transition animation
  }

  // Find the sidebar link (e.g. contains text and matches href path)
  const xpath = `//a[contains(., "${linkText}")]`;
  const link = await driver.wait(
    until.elementLocated(By.xpath(xpath)), 
    5000,
    `Could not locate navigation link containing text "${linkText}"`
  );
  await link.click();

  // Wait for the URL to change to the expected path
  await driver.wait(
    until.urlContains(pathPart), 
    5000,
    `Failed to navigate to path: ${pathPart}`
  );
  await driver.sleep(500); // Allow content to mount
}

// Core test suite runner for a specific mode
async function runSuite(mode) {
  console.log(`\n==================================================`);
  console.log(`STARTING E2E TEST SUITE: MODE = ${mode.toUpperCase()}`);
  console.log(`==================================================\n`);

  let driver;
  let savedComplaintId = '';

  try {
    driver = await createDriver(mode);

    // --- TEST CASE 1: Open landing page and execute E2E login bypass ---
    let startTime = Date.now();
    try {
      console.log(`[Test 1] Navigating to landing page...`);
      await driver.get(BASE_URL);

      // Verify page title or loaded content
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "SevaTrack")]')), 8000);
      
      console.log(`[Test 1] Injecting E2E bypass session...`);
      // Run fetch to login route in browser context
      const loginResult = await driver.executeScript(async (token) => {
        const response = await fetch('/api/auth/e2e-test', {
          method: 'POST',
          headers: {
            'x-e2e-test-token': token,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          return { success: false, status: response.status };
        }
        const data = await response.json();
        return { success: true, user: data.user };
      }, E2E_TOKEN);

      if (!loginResult || !loginResult.success) {
        throw new Error(`Auth API bypass failed. Is E2E_TEST_TOKEN set correctly in .env.local? Status: ${loginResult ? loginResult.status : 'unknown'}`);
      }

      console.log(`[Test 1] Session injected. Navigating to dashboard...`);
      await driver.get(BASE_URL + '/dashboard');
      await driver.sleep(2000); // Wait for potential mounts

      // Debug: print current URL
      const currentUrl = await driver.getCurrentUrl();
      console.log(`[Test 1 Debug] Current URL after navigating: ${currentUrl}`);

      // Verify redirected to dashboard and authenticated user greeting is present
      const greetingXPath = '//*[contains(text(), "Good morning")]';
      await driver.wait(until.elementLocated(By.xpath(greetingXPath)), 10000);
      
      logResult('Authentication Bypass', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 1] SUCCESS: Authenticated successfully!`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 500); // print first 500 chars
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Authentication Bypass', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 1] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
      throw err; // Stop executing if auth fails
    }

    // --- TEST CASE 2: Dashboard Navigation & UI Verification ---
    startTime = Date.now();
    try {
      console.log(`[Test 2] Verifying dashboard elements...`);
      // Look for stats cards (e.g. "Total Complaints")
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Total Complaints")]')), 5000);
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "In Progress")]')), 5000);
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Resolved")]')), 5000);

      logResult('Dashboard Elements Verification', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 2] SUCCESS: Dashboard loaded successfully.`);
    } catch (err) {
      logResult('Dashboard Elements Verification', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 2] FAILURE:`, err);
    }

    // --- TEST CASE 3: Submit Grievance ---
    startTime = Date.now();
    try {
      console.log(`[Test 3] Navigating to Submit Grievance page...`);
      await navigateTo(driver, mode, 'Submit Grievance', '/dashboard/submit');

      console.log(`[Test 3] Filling out grievance form...`);
      // Select Category: Water Supply
      const categoryBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[.//span[text()="Water Supply"]]')), 
        5000
      );
      await categoryBtn.click();

      // Enter location
      const locationInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder="Search for location..."]')), 
        5000
      );
      await locationInput.sendKeys(Key.CONTROL + 'a');
      await locationInput.sendKeys(Key.DELETE);
      await locationInput.sendKeys('Sector 15, Dwarka, New Delhi');

      // Enter description details
      const descriptionTextarea = await driver.wait(
        until.elementLocated(By.css('textarea[placeholder="Describe the issue in detail..."]')), 
        5000
      );
      await descriptionTextarea.sendKeys(Key.CONTROL + 'a');
      await descriptionTextarea.sendKeys(Key.DELETE);
      await descriptionTextarea.sendKeys('Major leakage from the primary pipeline near Sector 15 Metro Station. Water is logging on the main road.');

      // Urgency Level: Urgent
      const urgencyBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[text()="Urgent"]')), 
        5000
      );
      await urgencyBtn.click();

      console.log(`[Test 3] Submitting grievance...`);
      const submitBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "Review & Submit")]')), 
        5000
      );
      await submitBtn.click();

      // Wait for redirect to complaint details page (/dashboard/complaints/ST2026-xxxxxxx)
      await driver.wait(until.urlContains('/dashboard/complaints/ST2026-'), 10000);
      const url = await driver.getCurrentUrl();
      savedComplaintId = url.split('/').pop();
      console.log(`[Test 3] SUCCESS: Grievance submitted. ID = ${savedComplaintId}`);

      logResult('Submit Grievance', mode, 'PASSED', Date.now() - startTime);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1000); // print first 1000 chars
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Submit Grievance', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 3] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
    }

    // --- TEST CASE 4: Complaint Details & Timeline Verification ---
    startTime = Date.now();
    try {
      if (!savedComplaintId) throw new Error('No complaint ID saved from previous test.');

      console.log(`[Test 4] Verifying complaint details...`);
      // Assert complaint ID is displayed
      await driver.wait(until.elementLocated(By.xpath(`//h1[contains(text(), "${savedComplaintId}")]`)), 5000);
      
      // Check timeline items are present
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Complaint Registered")]')), 5000);
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Under Review")]')), 5000);

      logResult('Complaint Detail Verification', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 4] SUCCESS: Complaint detail verified.`);
    } catch (err) {
      logResult('Complaint Detail Verification', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 4] FAILURE:`, err);
    }

    // --- TEST CASE 5: Verify Auto-Assigned Partner ---
    startTime = Date.now();
    try {
      if (!savedComplaintId) throw new Error('No complaint ID saved from previous test.');

      console.log(`[Test 5] Verifying auto-assigned service partner...`);
      // Since category is "Water Supply", the assigned department is "Water Supply Department"
      // and according to server-data.ts seed, the partner is "Meera Singh"
      // Let's verify Meera Singh is listed on the page.
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Meera Singh")]')), 8000);

      logResult('Verify Auto-Assigned Partner', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 5] SUCCESS: Auto-assigned partner verified (Meera Singh).`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1000);
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Verify Auto-Assigned Partner', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 5] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
    }

    // --- TEST CASE 6: Workflow Transition (Mark Problem Completed) ---
    startTime = Date.now();
    try {
      if (!savedComplaintId) throw new Error('No complaint ID saved from previous test.');

      console.log(`[Test 6] Marking problem as completed...`);
      const completeBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "Mark Problem Completed")]')), 
        5000
      );
      await completeBtn.click();

      // Wait for completion message
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "completed by service partner")]')), 8000);

      logResult('Workflow: Mark Completed', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 6] SUCCESS: Problem marked as completed.`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      let statusMsg = 'None';
      try {
        const msgEl = await driver.findElements(By.css('p.text-primary, p.text-destructive, .text-sm.text-primary'));
        if (msgEl.length > 0) {
          statusMsg = await msgEl[0].getText();
        }
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1500);
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Workflow: Mark Completed', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 6] FAILURE at URL: ${currentUrl}. UI Status/Error Message: "${statusMsg}". Page body preview: \n${bodyText}\nError:`, err);
    }

    // --- TEST CASE 7: Experience Feedback Rating ---
    startTime = Date.now();
    try {
      if (!savedComplaintId) throw new Error('No complaint ID saved from previous test.');

      console.log(`[Test 7] Rating experience (5 Stars)...`);
      
      // Wait for rating section to mount
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Rate Your Experience")]')), 5000);

      // Stars are button.hover:scale-110 elements. We click the 5th star (index 4)
      const stars = await driver.findElements(By.css('button.hover\\:scale-110'));
      if (stars.length >= 5) {
        await stars[4].click();
      } else {
        throw new Error('Rating star buttons not found');
      }

      // Enter comment
      const commentInput = await driver.findElement(By.css('textarea[placeholder="Add a short comment..."]'));
      await commentInput.sendKeys('Quick response and thorough work. Satisfied!');

      // Click submit feedback button
      const submitFeedbackBtn = await driver.findElement(By.xpath('//button[text()="Submit Feedback"]'));
      await submitFeedbackBtn.click();

      // Wait for success message
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Thanks, your feedback was submitted")]')), 8000);

      logResult('Experience Rating Submission', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 7] SUCCESS: Feedback submitted successfully.`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1000);
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Experience Rating Submission', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 7] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
    }

    // --- TEST CASE 8: Workflow Transition (Close Complaint) ---
    startTime = Date.now();
    try {
      if (!savedComplaintId) throw new Error('No complaint ID saved from previous test.');

      console.log(`[Test 8] Closing the complaint...`);
      const closeBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "Close Complaint")]')), 
        5000
      );
      await closeBtn.click();

      // Wait for closure message
      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "closed successfully")]')), 8000);

      logResult('Workflow: Close Complaint', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 8] SUCCESS: Complaint closed.`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1000);
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Workflow: Close Complaint', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 8] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
    }

    // --- TEST CASE 9: Track Complaint Search ---
    startTime = Date.now();
    try {
      if (!savedComplaintId) throw new Error('No complaint ID saved from previous test.');

      console.log(`[Test 9] Navigating to Track page...`);
      await navigateTo(driver, mode, 'Track Complaint', '/dashboard/track');

      console.log(`[Test 9] Typing tracking ID...`);
      const trackInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder="e.g. ST2026-0001234"]')), 
        5000
      );
      await trackInput.sendKeys(Key.CONTROL + 'a');
      await trackInput.sendKeys(Key.DELETE);
      await trackInput.sendKeys(savedComplaintId);

      console.log(`[Test 9] Clicking track...`);
      const trackBtn = await driver.findElement(By.xpath('//button[contains(., "Track")]'));
      await trackBtn.click();

      // Wait for query load
      await driver.wait(until.urlContains(`id=${savedComplaintId}`), 5000);
      await driver.wait(until.elementLocated(By.xpath(`//*[contains(text(), "${savedComplaintId}")]`)), 5000);

      logResult('Track Complaint Search', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 9] SUCCESS: Complaint tracking search verified.`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1000);
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Track Complaint Search', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 9] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
    }

    // --- TEST CASE 10: Notifications Panel ---
    startTime = Date.now();
    try {
      console.log(`[Test 10] Navigating to Notifications...`);
      await navigateTo(driver, mode, 'Notifications', '/dashboard/notifications');

      // Check if notifications are listed (e.g. notifications page elements are loaded)
      await driver.wait(until.elementLocated(By.xpath('//h1[text()="Notifications"]')), 5000);
      
      logResult('Notifications Screen Verification', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 10] SUCCESS: Notifications screen verified.`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1000);
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Notifications Screen Verification', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 10] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
    }

    // --- TEST CASE 11: Profile Page navigation ---
    startTime = Date.now();
    try {
      console.log(`[Test 11] Navigating to Profile...`);
      await navigateTo(driver, mode, 'Profile', '/dashboard/profile');

      await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Profile")]')), 5000);

      logResult('Profile Navigation', mode, 'PASSED', Date.now() - startTime);
      console.log(`[Test 11] SUCCESS: Profile navigation verified.`);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      let bodyText = '';
      try {
        bodyText = await driver.findElement(By.tagName('body')).getText();
        bodyText = bodyText.substring(0, 1000);
      } catch (e) {
        bodyText = 'Failed to retrieve body text: ' + e.message;
      }
      logResult('Profile Navigation', mode, 'FAILED', Date.now() - startTime, err);
      console.error(`[Test 11] FAILURE at URL: ${currentUrl}. Page body preview: \n${bodyText}\nError:`, err);
    }

  } finally {
    if (driver) {
      console.log(`Closing WebDriver...`);
      await driver.quit();
    }
  }
}

// Function to generate the Excel report
function generateExcelReport() {
  console.log(`\nGenerating Excel Report: ${OUTPUT_FILE}...`);
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(testResults);

  // Set columns width for better presentation
  const wscols = [
    { wch: 30 }, // Test Case Name
    { wch: 10 }, // Mode
    { wch: 10 }, // Status
    { wch: 15 }, // Duration (ms)
    { wch: 25 }, // Timestamp
    { wch: 60 }  // Error Details
  ];
  ws['!cols'] = wscols;

  xlsx.utils.book_append_sheet(wb, ws, 'E2E Test Results');
  xlsx.writeFile(wb, OUTPUT_FILE);
  console.log(`Excel report successfully saved!`);
}

// Master Orchestrator
async function main() {
  const args = process.argv.slice(2);
  let selectedMode = 'both'; // both, web, mobile
  
  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      selectedMode = arg.split('=')[1].toLowerCase();
    }
  }

  console.log(`Selected mode: ${selectedMode.toUpperCase()}`);

  try {
    if (selectedMode === 'web' || selectedMode === 'both') {
      await runSuite('web');
    }
    if (selectedMode === 'mobile' || selectedMode === 'both') {
      await runSuite('mobile');
    }
  } catch (err) {
    console.error(`Fatal execution error occurred during E2E flow:`, err);
  } finally {
    generateExcelReport();
    console.log(`Test Execution Finished.`);
  }
}

main();
