from locust import HttpUser, task, between
import json

class SugarScanLoadTest(HttpUser):
    wait_time = between(1, 2)
    
    @task
    def check_health(self):
        with self.client.get("/api/v1/health", name="Health Check", catch_response=True) as response:
            if response.status_code in [200, 404]:
                response.success()
        
    @task(2)
    def check_dashboard(self):
        with self.client.get("/api/v1/dashboard/", name="Dashboard", catch_response=True) as response:
            if response.status_code in [200, 401]:
                response.success()

# Run via command line:
# locust -f locustfile.py --headless -u 50 -r 10 -t 10s --host=http://localhost:8000 --csv=locust_report
