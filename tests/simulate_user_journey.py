import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def slow_type(element, text, delay=0.05):
    """Type text slowly to simulate human interaction."""
    for char in text:
        element.send_keys(char)
        time.sleep(delay)

def run_user_journey():
    print("Starting User Journey Simulation...")
    options = webdriver.ChromeOptions()
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    driver = webdriver.Chrome(options=options)
    driver.maximize_window()
    wait = WebDriverWait(driver, 10)

    try:
        # Step 1: Visit Landing Page
        print("1. Visiting Landing Page...")
        driver.get("http://localhost:3000")
        time.sleep(2)
        
        # Step 2: Login as test user
        print("2. Logging in with test credentials...")
        email_input = wait.until(EC.presence_of_element_located((By.ID, "email")))
        password_input = driver.find_element(By.ID, "password")
        
        email_input.clear()
        slow_type(email_input, "test@example.com")
        time.sleep(0.5)
        
        password_input.clear()
        slow_type(password_input, "password123")
        time.sleep(0.5)
        
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        
        # Step 3: Explore Dashboard
        print("3. Exploring Dashboard...")
        wait.until(EC.url_contains("/dashboard"))
        time.sleep(2)
        
        # Scroll around dashboard to 'explore'
        driver.execute_script("window.scrollTo(0, 500);")
        time.sleep(1.5)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)

        # Step 4: Go to Submit Grievance
        print("4. Navigating to Submit Grievance...")
        submit_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/dashboard/submit')]")))
        submit_link.click()
        time.sleep(2)

        # Step 5: Fill out the grievance form
        print("5. Filling out a new grievance...")
        # Category: Water
        water_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[.//span[contains(text(), 'Water')]]")))
        water_btn.click()
        time.sleep(1)
        
        # Location
        loc_input = driver.find_element(By.XPATH, "//input[@placeholder='Search for location...']")
        loc_input.clear()
        slow_type(loc_input, "Sector 12, Main Road Layout")
        time.sleep(1)
        
        driver.execute_script("window.scrollTo(0, 400);")
        time.sleep(1)
        
        # Description
        desc_input = driver.find_element(By.TAG_NAME, "textarea")
        desc_input.clear()
        slow_type(desc_input, "There is a massive water leak here that has been ongoing for 2 days. It's causing flooding on the street.", delay=0.03)
        time.sleep(1)

        # Step 6: Submit the grievance
        print("6. Submitting the grievance...")
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)
        
        review_submit_btn = driver.find_element(By.XPATH, "//button[contains(., 'Review & Submit')]")
        review_submit_btn.click()
        
        # Wait for redirect to complaint details
        print("7. Waiting for submission confirmation...")
        wait.until(EC.url_contains("/complaints/"))
        time.sleep(3) # Let the user read the details

        # Step 8: Check My Complaints
        print("8. Checking 'My Complaints' list...")
        complaints_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/dashboard/complaints')]")))
        complaints_link.click()
        time.sleep(3)
        
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1)
        driver.execute_script("window.scrollTo(0, 0);")

        # Step 9: Track Grievance
        print("9. Exploring 'Track Grievance'...")
        track_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/dashboard/track')]")))
        track_link.click()
        time.sleep(3)

        # Step 10: Notifications
        print("10. Checking Notifications...")
        notif_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, '/dashboard/notifications')]")))
        notif_link.click()
        time.sleep(3)

        print("User journey completed successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        print("Keeping the browser open for 5 seconds before closing...")
        time.sleep(5)
        driver.quit()

if __name__ == "__main__":
    run_user_journey()
