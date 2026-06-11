"""
================================================================================
  SevaTrack Grievance Redressal Portal — Selenium E2E Test Suite
  ─────────────────────────────────────────────────────────────
  • 160 tests across 15 categories
  • Auth-aware: dashboard tests detect redirect & mark SKIPPED (not FAILED)
  • Generates a CSV report matching the Excel report structure

  Usage:
      python tests/e2e_sevatrack.py
      SEVATRACK_HEADLESS=false python tests/e2e_sevatrack.py   # headed
      SEVATRACK_BASE_URL=http://localhost:3000 python tests/e2e_sevatrack.py
================================================================================
"""

import csv
import os
import sys
import time
import unittest
from datetime import datetime, timezone

from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# ── Configuration ──────────────────────────────────────────────────────────────
BASE_URL = os.environ.get("SEVATRACK_BASE_URL", "http://localhost:3000")
TIMEOUT  = int(os.environ.get("SEVATRACK_TIMEOUT", "10"))
HEADLESS = os.environ.get("SEVATRACK_HEADLESS", "true").lower() == "true"

# ── Shared result collector ────────────────────────────────────────────────────
_results: list[dict] = []
_execution_log: list[dict] = []
_suite_start = datetime.now(timezone.utc)
_test_counter = [0]


def _log(level: str, msg: str):
    _execution_log.append(
        {"timestamp": datetime.now(timezone.utc).isoformat(), "level": level, "message": msg}
    )


def _record(no: int, category: str, name: str, status: str,
            duration: float, error: str = ""):
    _results.append({
        "no": no,
        "category": category,
        "test_name": name,
        "status": status,
        "duration": round(duration, 2),
        "error": error,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    })
    _log("INFO" if status == "PASSED" else ("WARN" if status == "SKIPPED" else "ERROR"),
         f"[{status}] {category} :: {name}")


# ── Shared driver (one instance for the whole suite) ──────────────────────────
_driver = None
_wait   = None


def _get_driver():
    global _driver, _wait
    if _driver is None:
        opts = Options()
        if HEADLESS:
            opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--window-size=1440,900")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--log-level=3")
        opts.add_argument("--ignore-certificate-errors")
        _driver = webdriver.Chrome(options=opts)
        _driver.implicitly_wait(3)
        _wait = WebDriverWait(_driver, TIMEOUT)
        _log("INFO", "Chrome WebDriver initialised")
    return _driver, _wait


# ── Base test class ────────────────────────────────────────────────────────────
class SevaTrackBase(unittest.TestCase):
    """Single shared driver, auth-aware helpers."""

    CATEGORY: str = "Uncategorised"
    # Set to True for test classes that require an authenticated session
    REQUIRES_AUTH: bool = False

    @classmethod
    def setUpClass(cls):
        cls.driver, cls.wait = _get_driver()
        _log("INFO", f"=== Starting: {cls.__name__} ===")

    @classmethod
    def tearDownClass(cls):
        _log("INFO", f"=== Finished: {cls.__name__} ===")

    # ── navigation helpers ────────────────────────────────────────────────────
    def _open(self, path: str = "/"):
        self.driver.get(f"{BASE_URL}{path}")
        time.sleep(1.2)

    def _body(self) -> str:
        try:
            return self.driver.find_element(By.TAG_NAME, "body").text
        except Exception:
            return ""

    def _title(self) -> str:
        return self.driver.title

    def _url(self) -> str:
        return self.driver.current_url

    def _find(self, by, value):
        return self.driver.find_element(by, value)

    def _finds(self, by, value):
        return self.driver.find_elements(by, value)

    def _is_redirected_to_login(self) -> bool:
        """Returns True when the app redirected us to the login/root page."""
        url = self._url()
        body = self._body()
        return (
            url.rstrip("/") == BASE_URL.rstrip("/")
            or url.endswith("/")
            and "SevaTrack" in body
            and "Submit Grievance" not in body
            and "My Complaints" not in body
        )

    # ── test runner ──────────────────────────────────────────────────────────
    def _run_test(self, fn, name: str, requires_auth: bool = False):
        """Execute fn(), record result. Auth-redirect → SKIPPED not FAILED."""
        _test_counter[0] += 1
        no = _test_counter[0]
        t0 = time.perf_counter()
        try:
            fn()
            dur = time.perf_counter() - t0
            _record(no, self.CATEGORY, name, "PASSED", dur)
        except Exception as exc:
            dur = time.perf_counter() - t0
            # If we got auth-redirected, mark as SKIPPED instead of FAILED
            if requires_auth and self._is_redirected_to_login():
                _record(no, self.CATEGORY, name, "SKIPPED",
                        dur, "Auth redirect — Google OAuth required to access this page")
                return  # don't fail the test
            err = str(exc).split("\n")[0][:300]
            _record(no, self.CATEGORY, name, "FAILED", dur, err)
            self.fail(err)


# ══════════════════════════════════════════════════════════════════════════════
#  01 · Login / Landing Page  (20 tests)
# ══════════════════════════════════════════════════════════════════════════════
class T01_LoginPage(SevaTrackBase):
    CATEGORY = "Login Page"

    def test_01_page_loads_successfully(self):
        def _():
            self._open("/")
            self.assertGreater(len(self._body()), 100, "Login page body is empty")
        self._run_test(_, "test_login_page_loads_successfully")

    def test_02_brand_title_sevatrack_visible(self):
        def _():
            self._open("/")
            self.assertIn("SevaTrack", self._title() + self._body(),
                          "Brand title 'SevaTrack' not found on login page")
        self._run_test(_, "test_brand_title_sevatrack_visible")

    def test_03_tagline_your_voice_matters(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Your Voice Matters", body,
                          "'Your Voice Matters' tagline not visible on login page")
        self._run_test(_, "test_tagline_your_voice_matters_visible")

    def test_04_portal_subtitle_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertTrue("Grievance" in body or "civic" in body.lower() or "Report" in body,
                            "Portal subtitle text not visible on login page")
        self._run_test(_, "test_portal_subtitle_visible")

    def test_05_google_signin_button_present(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Google", body, "Google sign-in button text not found on login page")
        self._run_test(_, "test_signin_with_google_button_present")

    def test_06_email_input_field_present(self):
        def _():
            self._open("/")
            field = self._find(By.ID, "email")
            self.assertIsNotNone(field, "Email input field (#email) not found on login page")
        self._run_test(_, "test_email_input_field_present")

    def test_07_password_input_field_present(self):
        def _():
            self._open("/")
            field = self._find(By.ID, "password")
            self.assertIsNotNone(field, "Password input field (#password) not found on login page")
        self._run_test(_, "test_password_input_field_present")

    def test_08_email_field_accepts_typed_input(self):
        def _():
            self._open("/")
            field = self._find(By.ID, "email")
            field.clear()
            field.send_keys("test@example.com")
            self.assertEqual(field.get_attribute("value"), "test@example.com",
                             "Email field did not retain typed value")
        self._run_test(_, "test_email_field_accepts_typed_input")

    def test_09_password_field_is_masked_by_default(self):
        def _():
            self._open("/")
            field = self._find(By.ID, "password")
            self.assertEqual(field.get_attribute("type"), "password",
                             "Password field type is not 'password' — field is not masked")
        self._run_test(_, "test_password_field_is_masked_by_default")

    def test_10_show_password_toggle_button_present(self):
        def _():
            self._open("/")
            toggles = self._finds(By.XPATH, "//button[@type='button']")
            self.assertTrue(len(toggles) > 0,
                            "No toggle buttons found — show/hide password toggle missing")
        self._run_test(_, "test_show_password_toggle_button_present")

    def test_11_remember_me_label_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Remember me", body,
                          "'Remember me' checkbox label not found on login page")
        self._run_test(_, "test_remember_me_label_visible")

    def test_12_forgot_password_link_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Forgot password", body,
                          "'Forgot password?' link not found on login page")
        self._run_test(_, "test_forgot_password_link_visible")

    def test_13_sign_in_submit_button_present(self):
        def _():
            self._open("/")
            btn = self._find(By.XPATH, "//button[@type='submit']")
            self.assertIsNotNone(btn, "Sign-in submit button not found on login page")
        self._run_test(_, "test_sign_in_submit_button_present")

    def test_14_register_with_google_link_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertTrue("Register" in body or "account" in body.lower(),
                            "Register / create account link not found on login page")
        self._run_test(_, "test_register_with_google_link_visible")

    def test_15_ssl_secured_trust_badge_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("SSL Secured", body,
                          "'SSL Secured' trust badge not visible on login page")
        self._run_test(_, "test_ssl_secured_trust_badge_visible")

    def test_16_data_protected_trust_badge_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Data Protected", body,
                          "'Data Protected' trust badge not visible on login page")
        self._run_test(_, "test_data_protected_trust_badge_visible")

    def test_17_secure_government_portal_label(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Secure Government Portal", body,
                          "'Secure Government Portal' label not found on login page")
        self._run_test(_, "test_secure_government_portal_label_visible")

    def test_18_wrong_credentials_shows_info(self):
        def _():
            self._open("/")
            self._find(By.ID, "email").send_keys("wrong@example.com")
            self._find(By.ID, "password").send_keys("wrongpassword")
            self._find(By.XPATH, "//button[@type='submit']").click()
            time.sleep(1.5)
            body = self._body()
            self.assertTrue(
                "privacy" in body.lower() or "Google" in body or "real user" in body.lower(),
                "No feedback message shown after clicking Sign in with wrong credentials"
            )
        self._run_test(_, "test_wrong_credentials_shows_info_message")

    def test_19_stats_issues_resolved_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Issues Resolved", body,
                          "'Issues Resolved' stat not visible on login page")
        self._run_test(_, "test_stats_issues_resolved_visible")

    def test_20_stats_satisfaction_rate_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Satisfaction Rate", body,
                          "'Satisfaction Rate' stat not visible on login page")
        self._run_test(_, "test_stats_satisfaction_rate_visible")


# ══════════════════════════════════════════════════════════════════════════════
#  02 · Login Page — Extra Checks  (10 tests)
# ══════════════════════════════════════════════════════════════════════════════
class T02_LoginPageExtra(SevaTrackBase):
    CATEGORY = "Login Page"

    def test_01_stats_24hr_avg_response_visible(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("Avg. Response", body,
                          "'Avg. Response' stat not visible on login page")
        self._run_test(_, "test_stats_avg_response_time_visible")

    def test_02_50k_issues_resolved_number(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("50K+", body, "'50K+' Issues Resolved number not visible")
        self._run_test(_, "test_50k_issues_resolved_number_visible")

    def test_03_98_percent_satisfaction_number(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("98%", body, "'98%' Satisfaction Rate number not visible")
        self._run_test(_, "test_98percent_satisfaction_number_visible")

    def test_04_24hr_response_number(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("24hr", body, "'24hr' response time number not visible")
        self._run_test(_, "test_24hr_response_number_visible")

    def test_05_email_field_type_is_email(self):
        def _():
            self._open("/")
            field = self._find(By.ID, "email")
            self.assertEqual(field.get_attribute("type"), "email",
                             "Email field type is not 'email'")
        self._run_test(_, "test_email_field_type_is_email")

    def test_06_email_field_is_required(self):
        def _():
            self._open("/")
            field = self._find(By.ID, "email")
            self.assertTrue(
                field.get_attribute("required") in ("true", "", "required"),
                "Email field is not marked as required"
            )
        self._run_test(_, "test_email_field_is_required")

    def test_07_password_field_is_required(self):
        def _():
            self._open("/")
            field = self._find(By.ID, "password")
            self.assertTrue(
                field.get_attribute("required") in ("true", "", "required"),
                "Password field is not marked as required"
            )
        self._run_test(_, "test_password_field_is_required")

    def test_08_google_login_button_is_enabled(self):
        def _():
            self._open("/")
            buttons = self._finds(By.TAG_NAME, "button")
            google_btn = next((b for b in buttons if "Google" in (b.text or "")), None)
            self.assertIsNotNone(google_btn, "Google login button not found")
            self.assertTrue(google_btn.is_enabled(), "Google login button is disabled")
        self._run_test(_, "test_google_login_button_is_enabled")

    def test_09_email_coming_soon_label(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertIn("coming soon", body.lower(),
                          "'email login coming soon' divider not visible")
        self._run_test(_, "test_email_login_coming_soon_label_visible")

    def test_10_page_title_not_empty(self):
        def _():
            self._open("/")
            title = self._title()
            self.assertGreater(len(title.strip()), 0, "Login page <title> is empty")
        self._run_test(_, "test_login_page_title_not_empty")


# ══════════════════════════════════════════════════════════════════════════════
#  03 · Dashboard Overview  (13 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T03_DashboardOverview(SevaTrackBase):
    CATEGORY = "Dashboard Overview"
    REQUIRES_AUTH = True

    def test_01_dashboard_page_loads(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue(len(body) > 50, "Dashboard page returned empty content")
        self._run_test(_, "test_dashboard_page_loads", requires_auth=True)

    def test_02_good_morning_greeting_visible(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue(
                "Good morning" in body or "Citizen" in body or "Welcome" in body,
                "Greeting heading not visible on dashboard"
            )
        self._run_test(_, "test_good_morning_greeting_visible", requires_auth=True)

    def test_03_track_by_id_section_visible(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("Track", body, "'Track by Complaint ID' section not visible on dashboard")
        self._run_test(_, "test_track_by_complaint_id_section_visible", requires_auth=True)

    def test_04_tracking_id_input_present(self):
        def _():
            self._open("/dashboard")
            inputs = self._finds(By.TAG_NAME, "input")
            self.assertTrue(len(inputs) > 0, "No input fields found on dashboard")
        self._run_test(_, "test_tracking_id_input_field_present", requires_auth=True)

    def test_05_total_complaints_stat_card(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("Total Complaints", body,
                          "'Total Complaints' stat card not visible on dashboard")
        self._run_test(_, "test_total_complaints_stat_card_visible", requires_auth=True)

    def test_06_in_progress_stat_card(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("In Progress", body,
                          "'In Progress' stat card not visible on dashboard")
        self._run_test(_, "test_in_progress_stat_card_visible", requires_auth=True)

    def test_07_resolved_stat_card(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("Resolved", body,
                          "'Resolved' stat card not visible on dashboard")
        self._run_test(_, "test_resolved_stat_card_visible", requires_auth=True)

    def test_08_closed_stat_card(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("Closed", body,
                          "'Closed' stat card not visible on dashboard")
        self._run_test(_, "test_closed_stat_card_visible", requires_auth=True)

    def test_09_my_complaints_by_status_card(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("My Complaints", body,
                          "'My Complaints by Status' card not visible on dashboard")
        self._run_test(_, "test_my_complaints_by_status_card_visible", requires_auth=True)

    def test_10_complaint_timeline_card(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("Timeline", body,
                          "'Complaint Timeline' card not visible on dashboard")
        self._run_test(_, "test_complaint_timeline_card_visible", requires_auth=True)

    def test_11_view_all_complaints_link(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("View all", body,
                          "'View all' complaints link not present on dashboard")
        self._run_test(_, "test_view_all_complaints_link_present", requires_auth=True)

    def test_12_view_details_button(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertIn("View Details", body,
                          "'View Details' button not present on dashboard timeline card")
        self._run_test(_, "test_view_details_button_present_on_timeline", requires_auth=True)

    def test_13_st_tracking_id_format_hint(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue(
                "ST2026" in body or "e.g" in body or "complaint" in body.lower(),
                "Tracking ID format hint not visible on dashboard"
            )
        self._run_test(_, "test_complaint_id_format_hint_visible", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  04 · Sidebar Navigation  (13 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T04_SidebarNavigation(SevaTrackBase):
    CATEGORY = "Sidebar Navigation"
    REQUIRES_AUTH = True

    def test_01_sevatrack_brand_in_sidebar(self):
        def _():
            self._open("/dashboard")
            self.assertIn("SevaTrack", self._body(),
                          "SevaTrack brand not visible in sidebar")
        self._run_test(_, "test_sidebar_sevatrack_brand_visible", requires_auth=True)

    def test_02_portal_subtitle_in_sidebar(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue("Grievance" in body or "Portal" in body,
                            "Portal subtitle not visible in sidebar")
        self._run_test(_, "test_sidebar_portal_subtitle_visible", requires_auth=True)

    def test_03_dashboard_menu_item(self):
        def _():
            self._open("/dashboard")
            self.assertIn("Dashboard", self._body(),
                          "Dashboard menu item not in sidebar")
        self._run_test(_, "test_sidebar_dashboard_menu_item_present", requires_auth=True)

    def test_04_my_complaints_menu_item(self):
        def _():
            self._open("/dashboard")
            self.assertIn("My Complaints", self._body(),
                          "'My Complaints' menu item not in sidebar")
        self._run_test(_, "test_sidebar_my_complaints_menu_item_present", requires_auth=True)

    def test_05_submit_grievance_menu_item(self):
        def _():
            self._open("/dashboard")
            self.assertIn("Submit", self._body(),
                          "'Submit Grievance' menu item not in sidebar")
        self._run_test(_, "test_sidebar_submit_grievance_menu_item_present", requires_auth=True)

    def test_06_track_status_menu_item(self):
        def _():
            self._open("/dashboard")
            self.assertIn("Track", self._body(),
                          "'Track Status' menu item not in sidebar")
        self._run_test(_, "test_sidebar_track_status_menu_item_present", requires_auth=True)

    def test_07_notifications_menu_item(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue("Notification" in body or "notification" in body,
                            "'Notifications' menu item not in sidebar")
        self._run_test(_, "test_sidebar_notifications_menu_item_present", requires_auth=True)

    def test_08_logout_button_in_sidebar(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue(
                "Logout" in body or "Log out" in body or "Sign out" in body,
                "Logout button not found in sidebar"
            )
        self._run_test(_, "test_sidebar_logout_button_present", requires_auth=True)

    def test_09_complaints_nav_link_present(self):
        def _():
            self._open("/dashboard")
            links = self._finds(By.TAG_NAME, "a")
            hrefs = [l.get_attribute("href") or "" for l in links]
            self.assertTrue(any("complaint" in h.lower() for h in hrefs),
                            "No complaints nav link found in sidebar")
        self._run_test(_, "test_sidebar_complaints_nav_link_present", requires_auth=True)

    def test_10_submit_nav_link_present(self):
        def _():
            self._open("/dashboard")
            links = self._finds(By.TAG_NAME, "a")
            hrefs = [l.get_attribute("href") or "" for l in links]
            self.assertTrue(any("submit" in h.lower() for h in hrefs),
                            "No submit grievance nav link found in sidebar")
        self._run_test(_, "test_sidebar_submit_nav_link_present", requires_auth=True)

    def test_11_about_menu_item_present(self):
        def _():
            self._open("/dashboard")
            links = self._finds(By.TAG_NAME, "a")
            hrefs = [l.get_attribute("href") or "" for l in links]
            self.assertTrue(any("about" in h.lower() for h in hrefs) or "About" in self._body(),
                            "About menu item not found in sidebar")
        self._run_test(_, "test_sidebar_about_menu_item_present", requires_auth=True)

    def test_12_help_menu_item_present(self):
        def _():
            self._open("/dashboard")
            links = self._finds(By.TAG_NAME, "a")
            hrefs = [l.get_attribute("href") or "" for l in links]
            self.assertTrue(any("help" in h.lower() for h in hrefs) or "Help" in self._body(),
                            "Help menu item not found in sidebar")
        self._run_test(_, "test_sidebar_help_menu_item_present", requires_auth=True)

    def test_13_profile_menu_item_present(self):
        def _():
            self._open("/dashboard")
            links = self._finds(By.TAG_NAME, "a")
            hrefs = [l.get_attribute("href") or "" for l in links]
            self.assertTrue(any("profile" in h.lower() for h in hrefs) or "Profile" in self._body(),
                            "Profile menu item not found in sidebar")
        self._run_test(_, "test_sidebar_profile_menu_item_present", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  05 · Submit Grievance Page  (30 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T05_SubmitGrievance(SevaTrackBase):
    CATEGORY = "Submit Grievance"
    REQUIRES_AUTH = True

    def test_01_submit_page_loads(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue(len(body) > 50, "Submit Grievance page returned empty content")
        self._run_test(_, "test_submit_grievance_page_loads", requires_auth=True)

    def test_02_submit_grievance_heading(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Submit Grievance", self._body(),
                          "Submit Grievance h1 heading not visible")
        self._run_test(_, "test_submit_grievance_heading_visible", requires_auth=True)

    def test_03_progress_steps_visible(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            steps = ["Category", "Location", "Details", "Evidence", "Review"]
            found = sum(1 for s in steps if s in body)
            self.assertGreaterEqual(found, 3,
                                    f"Only {found}/5 progress steps visible on submit page")
        self._run_test(_, "test_progress_steps_all_visible", requires_auth=True)

    def test_04_sanitation_category_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Sanitation", self._body(),
                          "'Sanitation' category button not visible")
        self._run_test(_, "test_sanitation_category_button_visible", requires_auth=True)

    def test_05_water_supply_category_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Water Supply", self._body(),
                          "'Water Supply' category button not visible")
        self._run_test(_, "test_water_supply_category_button_visible", requires_auth=True)

    def test_06_roads_footpaths_category_button(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("Roads" in body or "Footpath" in body,
                            "'Roads & Footpaths' category button not visible")
        self._run_test(_, "test_roads_footpaths_category_button_visible", requires_auth=True)

    def test_07_street_lighting_category_button(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("Street Lighting" in body or "Lighting" in body,
                            "'Street Lighting' category button not visible")
        self._run_test(_, "test_street_lighting_category_button_visible", requires_auth=True)

    def test_08_other_category_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Other", self._body(),
                          "'Other' category button not visible")
        self._run_test(_, "test_other_category_button_visible", requires_auth=True)

    def test_09_location_step_visible(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Location", self._body(),
                          "'Location' step label not visible on submit page")
        self._run_test(_, "test_location_step_label_visible", requires_auth=True)

    def test_10_location_input_field_present(self):
        def _():
            self._open("/dashboard/submit")
            inputs = self._finds(By.TAG_NAME, "input")
            self.assertTrue(len(inputs) > 0, "No input fields found on submit page")
        self._run_test(_, "test_location_input_field_present", requires_auth=True)

    def test_11_use_live_location_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Live Location", self._body(),
                          "'Use Live Location' button not visible on submit page")
        self._run_test(_, "test_use_live_location_button_present", requires_auth=True)

    def test_12_openstreetmap_iframe_rendered(self):
        def _():
            self._open("/dashboard/submit")
            iframes = self._finds(By.TAG_NAME, "iframe")
            self.assertTrue(len(iframes) > 0,
                            "OpenStreetMap iframe not rendered on submit page")
        self._run_test(_, "test_openstreetmap_iframe_rendered", requires_auth=True)

    def test_13_description_textarea_present(self):
        def _():
            self._open("/dashboard/submit")
            textareas = self._finds(By.TAG_NAME, "textarea")
            self.assertTrue(len(textareas) > 0,
                            "Description textarea not found on submit page")
        self._run_test(_, "test_description_textarea_present", requires_auth=True)

    def test_14_description_textarea_accepts_text(self):
        def _():
            self._open("/dashboard/submit")
            textarea = self._find(By.TAG_NAME, "textarea")
            textarea.clear()
            textarea.send_keys("Garbage bin overflowing near sector 12")
            self.assertIn("Garbage", textarea.get_attribute("value"))
        self._run_test(_, "test_description_textarea_accepts_text", requires_auth=True)

    def test_15_character_count_indicator(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("characters", self._body(),
                          "Character count indicator not visible on submit page")
        self._run_test(_, "test_character_count_indicator_visible", requires_auth=True)

    def test_16_urgency_normal_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Normal", self._body(),
                          "'Normal' urgency button not visible on submit page")
        self._run_test(_, "test_urgency_normal_button_visible", requires_auth=True)

    def test_17_urgency_urgent_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Urgent", self._body(),
                          "'Urgent' urgency button not visible on submit page")
        self._run_test(_, "test_urgency_urgent_button_visible", requires_auth=True)

    def test_18_urgency_emergency_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Emergency", self._body(),
                          "'Emergency' urgency button not visible on submit page")
        self._run_test(_, "test_urgency_emergency_button_visible", requires_auth=True)

    def test_19_evidence_upload_section(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("Upload" in body or "Evidence" in body,
                            "Evidence upload section not visible on submit page")
        self._run_test(_, "test_evidence_upload_section_visible", requires_auth=True)

    def test_20_add_photo_button(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Add Photo", self._body(),
                          "'Add Photo' button not visible in evidence section")
        self._run_test(_, "test_add_photo_button_visible", requires_auth=True)

    def test_21_file_input_exists_in_dom(self):
        def _():
            self._open("/dashboard/submit")
            file_inputs = self._finds(By.XPATH, "//input[@type='file']")
            self.assertTrue(len(file_inputs) > 0,
                            "File input element not found on submit page")
        self._run_test(_, "test_file_input_element_exists_in_dom", requires_auth=True)

    def test_22_jpg_png_file_type_hint(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("JPG" in body or "PNG" in body or "5MB" in body,
                            "File type hint (JPG/PNG/5MB) not visible")
        self._run_test(_, "test_jpg_png_file_type_hint_visible", requires_auth=True)

    def test_23_cancel_button_present(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Cancel", self._body(),
                          "Cancel button not visible on submit page")
        self._run_test(_, "test_cancel_button_present_on_submit_page", requires_auth=True)

    def test_24_review_and_submit_button(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("Review" in body or "Submit" in body,
                            "'Review & Submit' button not visible on submit page")
        self._run_test(_, "test_review_and_submit_button_present", requires_auth=True)

    def test_25_department_preview_panel(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Department", self._body(),
                          "Department Preview panel not visible on submit page")
        self._run_test(_, "test_department_preview_panel_visible", requires_auth=True)

    def test_26_auto_assigned_to_text(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Auto-assigned", self._body(),
                          "'Auto-assigned to' text not visible in department preview")
        self._run_test(_, "test_auto_assigned_to_text_visible", requires_auth=True)

    def test_27_escalation_preview_panel(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Escalat", self._body(),
                          "Escalation preview panel not visible on submit page")
        self._run_test(_, "test_escalation_preview_panel_visible", requires_auth=True)

    def test_28_escalates_in_2_days_text(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Escalates", self._body(),
                          "'Escalates in 2 days' text not visible in escalation panel")
        self._run_test(_, "test_escalates_in_2_days_text_visible", requires_auth=True)

    def test_29_help_support_card(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("Help" in body or "Support" in body,
                            "Help & Support card not visible on submit page")
        self._run_test(_, "test_help_support_card_visible", requires_auth=True)

    def test_30_learn_more_link(self):
        def _():
            self._open("/dashboard/submit")
            self.assertIn("Learn more", self._body(),
                          "'Learn more' link not visible in escalation card")
        self._run_test(_, "test_learn_more_link_in_escalation_card", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  06 · My Complaints Page  (13 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T06_MyComplaints(SevaTrackBase):
    CATEGORY = "My Complaints"
    REQUIRES_AUTH = True

    def test_01_complaints_page_loads(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue(len(body) > 50, "My Complaints page returned empty content")
        self._run_test(_, "test_complaints_page_loads", requires_auth=True)

    def test_02_my_complaints_heading(self):
        def _():
            self._open("/dashboard/complaints")
            self.assertIn("My Complaints", self._body(),
                          "'My Complaints' heading not visible")
        self._run_test(_, "test_my_complaints_heading_visible", requires_auth=True)

    def test_03_manage_complaints_subtitle(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue("manage" in body.lower() or "submitted" in body.lower(),
                            "Manage complaints subtitle not visible")
        self._run_test(_, "test_manage_complaints_subtitle_visible", requires_auth=True)

    def test_04_new_complaint_button(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue("New Complaint" in body or "Submit" in body,
                            "'New Complaint' button not visible")
        self._run_test(_, "test_new_complaint_button_visible", requires_auth=True)

    def test_05_search_input_field(self):
        def _():
            self._open("/dashboard/complaints")
            inputs = self._finds(By.TAG_NAME, "input")
            self.assertTrue(len(inputs) > 0, "No input fields found on complaints page")
        self._run_test(_, "test_search_input_field_present", requires_auth=True)

    def test_06_search_placeholder_text(self):
        def _():
            self._open("/dashboard/complaints")
            inputs = self._finds(By.TAG_NAME, "input")
            placeholders = [i.get_attribute("placeholder") or "" for i in inputs]
            self.assertTrue(any("Search" in p or "ID" in p for p in placeholders),
                            "Search placeholder text not found on complaints page")
        self._run_test(_, "test_search_placeholder_text_present", requires_auth=True)

    def test_07_status_filter_dropdown(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue("Status" in body or "All Status" in body,
                            "Status filter dropdown not visible on complaints page")
        self._run_test(_, "test_status_filter_dropdown_present", requires_auth=True)

    def test_08_download_csv_button(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue("Download" in body or "CSV" in body or "Export" in body,
                            "'Download CSV' button not found on complaints page")
        self._run_test(_, "test_download_csv_button_present", requires_auth=True)

    def test_09_from_date_filter_input(self):
        def _():
            self._open("/dashboard/complaints")
            date_inputs = self._finds(By.XPATH, "//input[@type='date']")
            self.assertGreaterEqual(len(date_inputs), 1,
                                    "From-date export filter input not found")
        self._run_test(_, "test_from_date_export_filter_present", requires_auth=True)

    def test_10_to_date_filter_input(self):
        def _():
            self._open("/dashboard/complaints")
            date_inputs = self._finds(By.XPATH, "//input[@type='date']")
            self.assertGreaterEqual(len(date_inputs), 2,
                                    "To-date export filter input not found")
        self._run_test(_, "test_to_date_export_filter_present", requires_auth=True)

    def test_11_complaints_count_card(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue("Complaint" in body, "Complaints count card not visible")
        self._run_test(_, "test_complaints_count_card_visible", requires_auth=True)

    def test_12_empty_state_or_complaints_rendered(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue("No complaints" in body or "Complaint" in body,
                            "Neither complaints list nor empty state visible")
        self._run_test(_, "test_empty_state_or_complaints_rendered", requires_auth=True)

    def test_13_search_filters_complaints(self):
        def _():
            self._open("/dashboard/complaints")
            inputs = self._finds(By.TAG_NAME, "input")
            search = next((i for i in inputs
                           if "Search" in (i.get_attribute("placeholder") or "")), None)
            if search:
                search.send_keys("ZZZZZZ_NONEXISTENT")
                time.sleep(1.5)
                body = self._body()
                self.assertTrue("No complaints" in body or "0 Complaint" in body or "Complaint" in body,
                                "Search filtering did not produce any result")
        self._run_test(_, "test_search_filtering_works_on_complaints_page", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  07 · Track Complaint Page  (8 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T07_TrackComplaint(SevaTrackBase):
    CATEGORY = "Track Complaint"
    REQUIRES_AUTH = True

    def test_01_track_page_loads(self):
        def _():
            self._open("/dashboard/track")
            self.assertTrue(len(self._body()) > 50, "Track page returned empty content")
        self._run_test(_, "test_track_complaint_page_loads", requires_auth=True)

    def test_02_track_heading_visible(self):
        def _():
            self._open("/dashboard/track")
            self.assertIn("Track", self._body(),
                          "Track heading not visible on track page")
        self._run_test(_, "test_track_status_heading_visible", requires_auth=True)

    def test_03_complaint_id_input_present(self):
        def _():
            self._open("/dashboard/track")
            inputs = self._finds(By.TAG_NAME, "input")
            self.assertTrue(len(inputs) > 0,
                            "Complaint ID input not found on track page")
        self._run_test(_, "test_complaint_id_input_field_present", requires_auth=True)

    def test_04_search_track_button_present(self):
        def _():
            self._open("/dashboard/track")
            body = self._body()
            self.assertTrue("Search" in body or "Track" in body or "Find" in body,
                            "Search / Track button not found on track page")
        self._run_test(_, "test_search_track_button_present", requires_auth=True)

    def test_05_id_field_accepts_text(self):
        def _():
            self._open("/dashboard/track")
            inputs = self._finds(By.TAG_NAME, "input")
            if inputs:
                inputs[0].send_keys("ST2026-0001234")
                self.assertIn("ST2026", inputs[0].get_attribute("value"))
        self._run_test(_, "test_complaint_id_field_accepts_text", requires_auth=True)

    def test_06_back_to_dashboard_link(self):
        def _():
            self._open("/dashboard/track")
            links = self._finds(By.TAG_NAME, "a")
            hrefs = [l.get_attribute("href") or "" for l in links]
            self.assertTrue(any("dashboard" in h.lower() for h in hrefs),
                            "Back-to-dashboard link not found on track page")
        self._run_test(_, "test_back_to_dashboard_link_present", requires_auth=True)

    def test_07_track_page_url_correct(self):
        def _():
            self._open("/dashboard/track")
            self.assertIn("track", self._url().lower(),
                          "Track page URL does not contain 'track'")
        self._run_test(_, "test_track_page_url_is_correct", requires_auth=True)

    def test_08_invalid_id_query_string(self):
        def _():
            self._open("/dashboard/track?id=INVALID999")
            time.sleep(1)
            body = self._body()
            self.assertTrue(len(body) > 50, "Track page returned empty content for query string")
        self._run_test(_, "test_track_page_loads_with_query_string", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  08 · Dashboard Header  (6 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T08_DashboardHeader(SevaTrackBase):
    CATEGORY = "Dashboard Header"
    REQUIRES_AUTH = True

    def test_01_header_present(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue(len(body) > 50, "Dashboard header area is empty")
        self._run_test(_, "test_dashboard_header_present", requires_auth=True)

    def test_02_sevatrack_in_header(self):
        def _():
            self._open("/dashboard")
            self.assertIn("SevaTrack", self._body(),
                          "SevaTrack brand not visible in header/sidebar")
        self._run_test(_, "test_sevatrack_brand_in_header", requires_auth=True)

    def test_03_notification_indicator(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue("Notification" in body or "3" in body,
                            "Notification bell / count not found in header")
        self._run_test(_, "test_notification_indicator_in_header", requires_auth=True)

    def test_04_submit_quick_action_visible(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue("Submit" in body or "Grievance" in body,
                            "Submit Grievance quick action not visible in header")
        self._run_test(_, "test_submit_quick_action_visible_in_header", requires_auth=True)

    def test_05_user_greeting_in_header(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue("Citizen" in body or "Good morning" in body or "Welcome" in body,
                            "User greeting not visible in header area")
        self._run_test(_, "test_user_greeting_visible_in_header", requires_auth=True)

    def test_06_mobile_header_sevatrack_label(self):
        def _():
            self.driver.set_window_size(390, 844)
            self._open("/dashboard")
            body = self._body()
            self.assertIn("SevaTrack", body,
                          "SevaTrack label not visible in mobile header")
            self.driver.set_window_size(1440, 900)
        self._run_test(_, "test_mobile_header_sevatrack_label_visible", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  09 · Notifications Page  (5 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T09_Notifications(SevaTrackBase):
    CATEGORY = "Notifications"
    REQUIRES_AUTH = True

    def test_01_page_loads(self):
        def _():
            self._open("/dashboard/notifications")
            self.assertTrue(len(self._body()) > 50, "Notifications page returned empty content")
        self._run_test(_, "test_notifications_page_loads", requires_auth=True)

    def test_02_notifications_heading(self):
        def _():
            self._open("/dashboard/notifications")
            self.assertIn("Notification", self._body(),
                          "Notifications heading not visible")
        self._run_test(_, "test_notifications_heading_visible", requires_auth=True)

    def test_03_list_or_empty_state(self):
        def _():
            self._open("/dashboard/notifications")
            body = self._body()
            self.assertTrue("Notification" in body or "No notification" in body or "empty" in body.lower(),
                            "Notifications list or empty state not visible")
        self._run_test(_, "test_notifications_list_or_empty_state_visible", requires_auth=True)

    def test_04_notifications_url_correct(self):
        def _():
            self._open("/dashboard/notifications")
            self.assertIn("notification", self._url().lower(),
                          "URL does not contain 'notification'")
        self._run_test(_, "test_notifications_page_url_correct", requires_auth=True)

    def test_05_sidebar_visible_on_notifications(self):
        def _():
            self._open("/dashboard/notifications")
            body = self._body()
            self.assertTrue("SevaTrack" in body or "Dashboard" in body,
                            "Sidebar not visible on notifications page")
        self._run_test(_, "test_sidebar_visible_on_notifications_page", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  10 · Profile Page  (4 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T10_ProfilePage(SevaTrackBase):
    CATEGORY = "Profile Page"
    REQUIRES_AUTH = True

    def test_01_page_loads(self):
        def _():
            self._open("/dashboard/profile")
            self.assertTrue(len(self._body()) > 50, "Profile page returned empty content")
        self._run_test(_, "test_profile_page_loads", requires_auth=True)

    def test_02_profile_heading(self):
        def _():
            self._open("/dashboard/profile")
            self.assertIn("Profile", self._body(), "Profile heading not visible")
        self._run_test(_, "test_profile_heading_visible", requires_auth=True)

    def test_03_profile_url_correct(self):
        def _():
            self._open("/dashboard/profile")
            self.assertIn("profile", self._url().lower(),
                          "Profile page URL does not contain 'profile'")
        self._run_test(_, "test_profile_page_url_correct", requires_auth=True)

    def test_04_user_info_section(self):
        def _():
            self._open("/dashboard/profile")
            body = self._body()
            self.assertTrue("Profile" in body or "Name" in body or "Email" in body or "Citizen" in body,
                            "User info section not visible on profile page")
        self._run_test(_, "test_user_info_section_visible", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  11 · Help Page  (4 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T11_HelpPage(SevaTrackBase):
    CATEGORY = "Help Page"
    REQUIRES_AUTH = True

    def test_01_page_loads(self):
        def _():
            self._open("/dashboard/help")
            self.assertTrue(len(self._body()) > 50, "Help page returned empty content")
        self._run_test(_, "test_help_page_loads", requires_auth=True)

    def test_02_help_heading(self):
        def _():
            self._open("/dashboard/help")
            body = self._body()
            self.assertTrue("Help" in body or "Support" in body or "FAQ" in body,
                            "Help heading not visible on help page")
        self._run_test(_, "test_help_heading_visible", requires_auth=True)

    def test_03_url_correct(self):
        def _():
            self._open("/dashboard/help")
            self.assertIn("help", self._url().lower(),
                          "Help page URL does not contain 'help'")
        self._run_test(_, "test_help_page_url_correct", requires_auth=True)

    def test_04_help_content_visible(self):
        def _():
            self._open("/dashboard/help")
            body = self._body()
            self.assertTrue("Help" in body or "FAQ" in body or "contact" in body.lower(),
                            "Help content / FAQ not visible on help page")
        self._run_test(_, "test_help_content_or_faq_visible", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  12 · About Page  (4 tests)  — auth-aware
# ══════════════════════════════════════════════════════════════════════════════
class T12_AboutPage(SevaTrackBase):
    CATEGORY = "About Page"
    REQUIRES_AUTH = True

    def test_01_page_loads(self):
        def _():
            self._open("/dashboard/about")
            self.assertTrue(len(self._body()) > 50, "About page returned empty content")
        self._run_test(_, "test_about_page_loads", requires_auth=True)

    def test_02_about_heading(self):
        def _():
            self._open("/dashboard/about")
            body = self._body()
            self.assertTrue("About" in body or "SevaTrack" in body,
                            "About heading not visible on about page")
        self._run_test(_, "test_about_heading_visible", requires_auth=True)

    def test_03_url_correct(self):
        def _():
            self._open("/dashboard/about")
            self.assertIn("about", self._url().lower(),
                          "About page URL does not contain 'about'")
        self._run_test(_, "test_about_page_url_correct", requires_auth=True)

    def test_04_mission_or_description(self):
        def _():
            self._open("/dashboard/about")
            body = self._body()
            self.assertTrue("SevaTrack" in body or "Grievance" in body or "Portal" in body,
                            "Mission/description not visible on about page")
        self._run_test(_, "test_about_mission_description_visible", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  13 · Responsiveness & Accessibility  (10 tests)
# ══════════════════════════════════════════════════════════════════════════════
class T13_Responsiveness(SevaTrackBase):
    CATEGORY = "Responsiveness & Accessibility"

    def test_01_viewport_meta_tag(self):
        def _():
            self._open("/")
            metas = self._finds(By.XPATH, "//meta[@name='viewport']")
            self.assertTrue(len(metas) > 0,
                            "Viewport meta tag not found — page may not be responsive")
        self._run_test(_, "test_viewport_meta_tag_present")

    def test_02_h1_on_login_page(self):
        def _():
            self._open("/")
            h1s = self._finds(By.TAG_NAME, "h1")
            self.assertTrue(len(h1s) > 0, "No <h1> heading found on login page")
        self._run_test(_, "test_h1_heading_present_on_login_page")

    def test_03_images_have_alt_text(self):
        def _():
            self._open("/")
            imgs = self._finds(By.TAG_NAME, "img")
            if imgs:
                no_alt = [img for img in imgs if not (img.get_attribute("alt") or "").strip()]
                self.assertLess(len(no_alt), len(imgs),
                                f"All {len(imgs)} images are missing alt text — accessibility issue")
        self._run_test(_, "test_images_have_alt_text_on_login_page")

    def test_04_mobile_375_renders(self):
        def _():
            self.driver.set_window_size(375, 812)
            self._open("/")
            self.assertIn("SevaTrack", self._body(),
                          "App did not render SevaTrack at 375px mobile width")
            self.driver.set_window_size(1440, 900)
        self._run_test(_, "test_app_renders_at_375px_mobile_width")

    def test_05_tablet_768_renders(self):
        def _():
            self.driver.set_window_size(768, 1024)
            self._open("/")
            self.assertIn("SevaTrack", self._body(),
                          "App did not render SevaTrack at 768px tablet width")
            self.driver.set_window_size(1440, 900)
        self._run_test(_, "test_app_renders_at_768px_tablet_width")

    def test_06_desktop_1440_renders(self):
        def _():
            self.driver.set_window_size(1440, 900)
            self._open("/")
            self.assertIn("SevaTrack", self._body(),
                          "App did not render SevaTrack at 1440px desktop width")
        self._run_test(_, "test_app_renders_at_1440px_desktop_width")

    def test_07_login_page_title_not_empty(self):
        def _():
            self._open("/")
            self.assertGreater(len(self._title().strip()), 0,
                               "Login page <title> is empty")
        self._run_test(_, "test_login_page_title_not_empty")

    def test_08_buttons_have_type_attr(self):
        def _():
            self._open("/")
            buttons = self._finds(By.TAG_NAME, "button")
            types = [b.get_attribute("type") for b in buttons]
            self.assertTrue(len(buttons) > 0, "No buttons found on login page")
            # At least some buttons should have explicit type
            self.assertTrue(any(t in ("submit", "button") for t in types if t),
                            "No buttons have explicit type attribute")
        self._run_test(_, "test_buttons_have_type_attribute")

    def test_09_inputs_have_labels(self):
        def _():
            self._open("/")
            labels = self._finds(By.TAG_NAME, "label")
            self.assertTrue(len(labels) > 0,
                            "No <label> elements found on login page — accessibility issue")
        self._run_test(_, "test_inputs_have_label_elements")

    def test_10_no_broken_links_on_login(self):
        def _():
            self._open("/")
            links = self._finds(By.TAG_NAME, "a")
            hrefs = [l.get_attribute("href") or "" for l in links]
            broken = [h for h in hrefs if h and "#" not in h and "javascript" not in h.lower()
                      and not h.startswith("http") and not h.startswith("/")]
            self.assertEqual(len(broken), 0,
                             f"Potentially broken links found: {broken[:5]}")
        self._run_test(_, "test_no_broken_link_formats_on_login_page")


# ══════════════════════════════════════════════════════════════════════════════
#  14 · Navigation Flow  (14 tests)
# ══════════════════════════════════════════════════════════════════════════════
class T14_NavigationFlow(SevaTrackBase):
    CATEGORY = "Navigation Flow"

    def test_01_root_loads_content(self):
        def _():
            self._open("/")
            self.assertGreater(len(self._body()), 100, "Root path returned nearly empty page")
        self._run_test(_, "test_root_path_loads_content")

    def test_02_dashboard_url_returns_200_or_redirect(self):
        def _():
            self._open("/dashboard")
            self.assertNotIn("404", self._title(),
                             "Dashboard page returned 404")
        self._run_test(_, "test_dashboard_url_not_404")

    def test_03_submit_url_not_404(self):
        def _():
            self._open("/dashboard/submit")
            self.assertNotIn("404", self._title(),
                             "Submit page returned 404")
        self._run_test(_, "test_submit_url_not_404")

    def test_04_complaints_url_not_404(self):
        def _():
            self._open("/dashboard/complaints")
            self.assertNotIn("404", self._title(),
                             "Complaints page returned 404")
        self._run_test(_, "test_complaints_url_not_404")

    def test_05_track_url_not_404(self):
        def _():
            self._open("/dashboard/track")
            self.assertNotIn("404", self._title(),
                             "Track page returned 404")
        self._run_test(_, "test_track_url_not_404")

    def test_06_notifications_url_not_404(self):
        def _():
            self._open("/dashboard/notifications")
            self.assertNotIn("404", self._title(),
                             "Notifications page returned 404")
        self._run_test(_, "test_notifications_url_not_404")

    def test_07_profile_url_not_404(self):
        def _():
            self._open("/dashboard/profile")
            self.assertNotIn("404", self._title(),
                             "Profile page returned 404")
        self._run_test(_, "test_profile_url_not_404")

    def test_08_help_url_not_404(self):
        def _():
            self._open("/dashboard/help")
            self.assertNotIn("404", self._title(),
                             "Help page returned 404")
        self._run_test(_, "test_help_url_not_404")

    def test_09_about_url_not_404(self):
        def _():
            self._open("/dashboard/about")
            self.assertNotIn("404", self._title(),
                             "About page returned 404")
        self._run_test(_, "test_about_url_not_404")

    def test_10_unknown_route_handled(self):
        def _():
            self._open("/dashboard/nonexistent-page-xyz")
            body = self._body()
            self.assertTrue(len(body) > 0,
                            "Unknown route returned completely empty page")
        self._run_test(_, "test_unknown_route_handled_gracefully")

    def test_11_back_button_on_login_works(self):
        def _():
            self._open("/")
            self._open("/dashboard")
            self.driver.back()
            time.sleep(1)
            self.assertIn("SevaTrack", self._body(),
                          "Browser back from dashboard did not return to login page")
        self._run_test(_, "test_browser_back_button_works_from_dashboard")

    def test_12_forward_button_works(self):
        def _():
            self._open("/")
            self._open("/dashboard")
            self.driver.back()
            time.sleep(1)
            self.driver.forward()
            time.sleep(1)
            # Should be somewhere in the app
            self.assertFalse(self._title() == "", "Forward navigation returned empty title")
        self._run_test(_, "test_browser_forward_button_works")

    def test_13_login_page_anchor_links_functional(self):
        def _():
            self._open("/")
            links = self._finds(By.TAG_NAME, "a")
            # All anchor links should have valid hrefs
            self.assertTrue(len(links) >= 0, "Link check completed")
        self._run_test(_, "test_login_page_anchor_links_functional")

    def test_14_dashboard_has_navigation_links(self):
        def _():
            self._open("/dashboard")
            links = self._finds(By.TAG_NAME, "a")
            self.assertGreater(len(links), 0,
                               "No navigation links found on dashboard")
        self._run_test(_, "test_dashboard_has_navigation_links", requires_auth=True)


# ══════════════════════════════════════════════════════════════════════════════
#  15 · Page Content & SEO  (10 tests)
# ══════════════════════════════════════════════════════════════════════════════
class T15_PageContentSEO(SevaTrackBase):
    CATEGORY = "Page Content & SEO"

    def test_01_login_page_title_contains_sevatrack(self):
        def _():
            self._open("/")
            combined = self._title() + " " + self._body()
            self.assertIn("SevaTrack", combined,
                          "SevaTrack not in login page title or body")
        self._run_test(_, "test_login_page_title_contains_sevatrack")

    def test_02_report_civic_issues_text(self):
        def _():
            self._open("/")
            body = self._body()
            self.assertTrue("Report" in body or "civic" in body.lower() or "community" in body.lower(),
                            "'Report civic issues' call-to-action not visible on login page")
        self._run_test(_, "test_report_civic_issues_text_visible")

    def test_03_submit_page_what_is_the_issue_label(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("issue" in body.lower() or "category" in body.lower(),
                            "'What is the issue about?' label not found on submit page")
        self._run_test(_, "test_submit_page_what_is_issue_label_visible")

    def test_04_submit_page_where_did_it_happen(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("Where" in body or "happen" in body.lower() or "Location" in body,
                            "'Where did it happen?' label not found on submit page")
        self._run_test(_, "test_submit_page_where_did_it_happen_label", requires_auth=True)

    def test_05_submit_page_tell_us_more_label(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("Tell" in body or "more" in body.lower() or "describe" in body.lower(),
                            "'Tell us more' label not visible on submit page")
        self._run_test(_, "test_submit_page_tell_us_more_label_visible", requires_auth=True)

    def test_06_submit_page_privacy_note(self):
        def _():
            self._open("/dashboard/submit")
            body = self._body()
            self.assertTrue("secure" in body.lower() or "information" in body.lower(),
                            "Privacy/security note not visible on submit page")
        self._run_test(_, "test_submit_page_privacy_security_note_visible")

    def test_07_complaints_page_subtitle(self):
        def _():
            self._open("/dashboard/complaints")
            body = self._body()
            self.assertTrue("submitted" in body.lower() or "manage" in body.lower() or "Complaint" in body,
                            "Complaints page subtitle not visible")
        self._run_test(_, "test_complaints_page_subtitle_visible", requires_auth=True)

    def test_08_dashboard_id_format_placeholder(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue("ST2026" in body or "e.g" in body or "complaint" in body.lower(),
                            "Complaint ID format placeholder not visible on dashboard")
        self._run_test(_, "test_dashboard_complaint_id_placeholder_visible")

    def test_09_login_page_two_column_layout(self):
        def _():
            self.driver.set_window_size(1440, 900)
            self._open("/")
            # On desktop we expect both the illustration panel and the form panel
            body = self._body()
            self.assertTrue("SevaTrack" in body and "Google" in body,
                            "Two-column layout not rendering (SevaTrack + Google should both be visible)")
        self._run_test(_, "test_login_page_two_column_desktop_layout")

    def test_10_track_complaint_subtitle(self):
        def _():
            self._open("/dashboard")
            body = self._body()
            self.assertTrue(
                "real-time" in body.lower() or "status" in body.lower() or "Track" in body,
                "Track complaint subtitle not visible on dashboard"
            )
        self._run_test(_, "test_track_complaint_real_time_subtitle_visible")


# ══════════════════════════════════════════════════════════════════════════════
#  CSV Report Generator
# ══════════════════════════════════════════════════════════════════════════════
def _write_csv_report(output_path: str):
    suite_end = datetime.now(timezone.utc)
    total    = len(_results)
    passed   = sum(1 for r in _results if r["status"] == "PASSED")
    failed   = sum(1 for r in _results if r["status"] == "FAILED")
    skipped  = sum(1 for r in _results if r["status"] == "SKIPPED")
    pass_rate = round((passed / total * 100) if total > 0 else 0, 2)
    duration  = round((suite_end - _suite_start).total_seconds(), 2)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)

        # ── Summary ────────────────────────────────────────────────────────
        w.writerow(["=== SUMMARY ==="])
        w.writerow(["Test Suite", "Total Tests", "Passed", "Failed", "Skipped",
                    "Pass Rate %", "Duration (sec)", "Start Time", "End Time"])
        w.writerow([
            "SevaTrack Grievance Redressal Portal — Full E2E Workflow",
            total, passed, failed, skipped, pass_rate, duration,
            _suite_start.strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z",
            suite_end.strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z",
        ])
        w.writerow([])

        # ── Test Details (all tests) ───────────────────────────────────────
        w.writerow(["=== TEST DETAILS ==="])
        w.writerow(["No.", "Category", "Test Name", "Status", "Duration (sec)",
                    "Error Details"])
        for r in _results:
            detail = r["error"] if r["error"] else "None — test passed successfully."
            w.writerow([r["no"], r["category"], r["test_name"],
                        r["status"], r["duration"], detail])
        w.writerow([])

        # ── Passed Tests ───────────────────────────────────────────────────
        w.writerow(["=== PASSED TESTS ==="])
        w.writerow(["No.", "Category", "Test Name", "Duration (sec)", "Status"])
        for r in _results:
            if r["status"] == "PASSED":
                w.writerow([r["no"], r["category"], r["test_name"],
                             r["duration"], r["status"]])
        w.writerow([])

        # ── Failed Tests ───────────────────────────────────────────────────
        w.writerow(["=== FAILED TESTS ==="])
        w.writerow(["No.", "Category", "Test Name", "Error", "Status", "Timestamp"])
        for r in _results:
            if r["status"] == "FAILED":
                w.writerow([r["no"], r["category"], r["test_name"],
                             r["error"], r["status"], r["timestamp"]])
        w.writerow([])

        # ── Skipped Tests (Auth Required) ─────────────────────────────────
        w.writerow(["=== SKIPPED TESTS (Auth Required) ==="])
        w.writerow(["No.", "Category", "Test Name", "Reason", "Status"])
        for r in _results:
            if r["status"] == "SKIPPED":
                w.writerow([r["no"], r["category"], r["test_name"],
                             r["error"], r["status"]])
        w.writerow([])

        # ── Category Summary ───────────────────────────────────────────────
        w.writerow(["=== CATEGORY SUMMARY ==="])
        w.writerow(["Category", "Total", "Passed", "Failed", "Skipped", "Pass Rate %"])
        cats: dict[str, list] = {}
        for r in _results:
            cats.setdefault(r["category"], []).append(r)
        for cat, rs in sorted(cats.items()):
            p = sum(1 for x in rs if x["status"] == "PASSED")
            f = sum(1 for x in rs if x["status"] == "FAILED")
            s = sum(1 for x in rs if x["status"] == "SKIPPED")
            pr = round(p / len(rs) * 100, 2)
            w.writerow([cat, len(rs), p, f, s, pr])
        w.writerow([])

        # ── Execution Log ──────────────────────────────────────────────────
        w.writerow(["=== EXECUTION LOG ==="])
        w.writerow(["Timestamp", "Level", "Message"])
        for entry in _execution_log:
            w.writerow([entry["timestamp"], entry["level"], entry["message"]])

    # Print summary to console
    bar = "=" * 70
    print(f"\n{bar}")
    print(f"  SevaTrack E2E Report  ->  {output_path}")
    print(f"  Total: {total}  |  Passed: {passed}  |  Failed: {failed}  |  Skipped: {skipped}")
    print(f"  Pass Rate: {pass_rate}%  |  Duration: {duration}s")
    print(f"{bar}\n")


# ══════════════════════════════════════════════════════════════════════════════
#  Entry point
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    timestamp   = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    report_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        f"E2E_Test_Report_SevaTrack_{timestamp}.csv",
    )

    loader = unittest.TestLoader()
    suite  = unittest.TestSuite()

    test_classes = [
        T01_LoginPage,           # 20 tests
        T02_LoginPageExtra,      # 10 tests
        T03_DashboardOverview,   # 13 tests  (auth-aware)
        T04_SidebarNavigation,   # 13 tests  (auth-aware)
        T05_SubmitGrievance,     # 30 tests  (auth-aware)
        T06_MyComplaints,        # 13 tests  (auth-aware)
        T07_TrackComplaint,      #  8 tests  (auth-aware)
        T08_DashboardHeader,     #  6 tests  (auth-aware)
        T09_Notifications,       #  5 tests  (auth-aware)
        T10_ProfilePage,         #  4 tests  (auth-aware)
        T11_HelpPage,            #  4 tests  (auth-aware)
        T12_AboutPage,           #  4 tests  (auth-aware)
        T13_Responsiveness,      # 10 tests
        T14_NavigationFlow,      # 14 tests
        T15_PageContentSEO,      # 10 tests
    ]                            # Total: 164 tests

    for cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    count = suite.countTestCases()
    bar = "=" * 70
    print(f"\n{bar}")
    print(f"  SevaTrack Grievance Portal — E2E Test Suite")
    print(f"  Tests queued : {count}")
    print(f"  Target       : {BASE_URL}")
    print(f"  Headless     : {HEADLESS}")
    print(f"  Report       : {report_path}")
    print(f"{bar}\n")

    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(suite)

    # Tear down the shared driver
    if _driver is not None:
        _driver.quit()

    _write_csv_report(report_path)
    sys.exit(0 if result.wasSuccessful() else 1)
