import pytest
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage

class TestAuthentication:
    def test_login_page_loads(self, driver, base_url):
        """Verify that the login page loads successfully."""
        login_page = LoginPage(driver)
        login_page.load(base_url)
        assert login_page.is_visible(login_page.EMAIL_INPUT)
        assert login_page.is_visible(login_page.PASSWORD_INPUT)
        assert login_page.is_visible(login_page.SIGN_IN_BUTTON)

    def test_login_invalid_credentials(self, driver, base_url):
        """Verify that logging in with invalid credentials shows an error."""
        login_page = LoginPage(driver)
        login_page.load(base_url)
        login_page.login("invalid@test.com", "wrongpassword123")
        # In a real app, this should show an error message or toast
        # Since we are testing the UI, we verify the user is NOT redirected to the dashboard
        dashboard_page = DashboardPage(driver)
        assert not dashboard_page.is_loaded()
        
    def test_navigate_to_registration(self, driver, base_url):
        """Verify navigation to the registration screen."""
        login_page = LoginPage(driver)
        login_page.load(base_url)
        login_page.go_to_register()
        login_page.wait_for_url_contains("register")
        assert "register" in driver.current_url
