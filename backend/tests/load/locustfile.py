from locust import HttpUser, task, between

class SugarScanApiUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # In a real environment, we would fetch or generate a real Supabase JWT here.
        # For the load test, we assume the backend has a mocked auth layer or we inject a valid long-lived token.
        self.headers = {"Authorization": "Bearer TEST_TOKEN"}

    @task(3)
    def get_dashboard(self):
        self.client.get("/api/v1/dashboard/", headers=self.headers, name="/api/v1/dashboard/")

    @task(2)
    def list_scans(self):
        self.client.get("/api/v1/scans/", headers=self.headers, name="/api/v1/scans/")

    @task(1)
    def health_check(self):
        self.client.get("/api/v1/health-check", name="/api/v1/health-check")
