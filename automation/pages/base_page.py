from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time

class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    def find_element(self, by_locator):
        return self.wait.until(EC.presence_of_element_located(by_locator))
        
    def find_elements(self, by_locator):
        return self.wait.until(EC.presence_of_all_elements_located(by_locator))

    def click(self, by_locator):
        element = self.wait.until(EC.element_to_be_clickable(by_locator))
        # Sometimes React Native Web elements need a small delay or JS click
        try:
            element.click()
        except:
            self.driver.execute_script("arguments[0].click();", element)

    def enter_text(self, by_locator, text):
        element = self.wait.until(EC.visibility_of_element_located(by_locator))
        element.clear()
        element.send_keys(text)

    def is_visible(self, by_locator, timeout=10):
        try:
            WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located(by_locator))
            return True
        except TimeoutException:
            return False

    def get_text(self, by_locator):
        element = self.wait.until(EC.visibility_of_element_located(by_locator))
        return element.text

    def wait_for_url_contains(self, text, timeout=15):
        WebDriverWait(self.driver, timeout).until(EC.url_contains(text))
