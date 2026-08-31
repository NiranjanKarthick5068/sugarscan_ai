import pytest
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

@pytest.fixture(scope="session")
def base_url():
    # Use environment variable or fallback to a local URL for local testing
    return os.environ.get("TEST_BASE_URL", "http://localhost:3002")

@pytest.fixture(scope="function")
def driver(request):
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # We want to test mobile responsiveness in some tests, but default to desktop to avoid issues
    # A mobile fixture could be created separately or window resized within tests.
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    driver.implicitly_wait(10)
    
    yield driver
    
    # Take screenshot on failure
    if request.node.rep_call.failed:
        take_screenshot(driver, request.node.name)
        
    driver.quit()

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    # execute all other hooks to obtain the report object
    outcome = yield
    rep = outcome.get_result()
    # set a report attribute for each phase of a call, which can
    # be "setup", "call", "teardown"
    setattr(item, "rep_" + rep.when, rep)

def take_screenshot(driver, node_name):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs("screenshots", exist_ok=True)
    file_name = f"screenshots/{node_name}_{timestamp}.png"
    driver.save_screenshot(file_name)
    print(f"Screenshot saved as {file_name}")
