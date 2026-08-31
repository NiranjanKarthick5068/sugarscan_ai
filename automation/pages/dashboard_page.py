from selenium.webdriver.common.by import By
from .base_page import BasePage

class DashboardPage(BasePage):
    # Locators
    DASHBOARD_TITLE = (By.XPATH, "//div[contains(text(), 'Dashboard')]")
    LOG_MEAL_BUTTON = (By.XPATH, "//div[contains(text(), 'Log Meal') or contains(text(), 'Scan')]")
    LOG_GLUCOSE_BUTTON = (By.XPATH, "//div[contains(text(), 'Glucose')]")
    SETTINGS_TAB = (By.XPATH, "//div[contains(text(), 'Profile') or contains(text(), 'Settings')]")
    
    def __init__(self, driver):
        super().__init__(driver)

    def is_loaded(self):
        return self.is_visible(self.DASHBOARD_TITLE)
        
    def go_to_log_meal(self):
        self.click(self.LOG_MEAL_BUTTON)
        
    def go_to_log_glucose(self):
        self.click(self.LOG_GLUCOSE_BUTTON)
        
    def go_to_settings(self):
        self.click(self.SETTINGS_TAB)
