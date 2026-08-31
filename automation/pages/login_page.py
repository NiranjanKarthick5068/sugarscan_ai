from selenium.webdriver.common.by import By
from .base_page import BasePage

class LoginPage(BasePage):
    # Locators
    # We use XPath to find elements by their placeholder or text since React Native Web generates hashed class names
    EMAIL_INPUT = (By.XPATH, "//input[@placeholder='your@email.com']")
    PASSWORD_INPUT = (By.XPATH, "//input[@placeholder='Enter your password']")
    SIGN_IN_BUTTON = (By.XPATH, "//div[text()='Sign In' and @dir='auto']")
    CREATE_ACCOUNT_BUTTON = (By.XPATH, "//div[text()='Create Account' and @dir='auto']")
    
    def __init__(self, driver):
        super().__init__(driver)

    def load(self, base_url):
        self.driver.get(f"{base_url}/")
        
    def login(self, email, password):
        self.enter_text(self.EMAIL_INPUT, email)
        self.enter_text(self.PASSWORD_INPUT, password)
        self.click(self.SIGN_IN_BUTTON)
        
    def go_to_register(self):
        self.click(self.CREATE_ACCOUNT_BUTTON)
