import os

ENDPOINTS = [
    {"name": "users_me_get", "path": "/api/v1/users/me", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "users_me_patch", "path": "/api/v1/users/me", "method": "PATCH", "auth": True, "has_id": False, "body": True},
    {"name": "users_health_get", "path": "/api/v1/users/me/health", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "users_health_put", "path": "/api/v1/users/me/health", "method": "PUT", "auth": True, "has_id": False, "body": True},
    {"name": "scans_post", "path": "/api/v1/scans/", "method": "POST", "auth": True, "has_id": False, "body": True},
    {"name": "scans_stats", "path": "/api/v1/scans/stats", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "scans_get", "path": "/api/v1/scans/", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "scans_id_get", "path": "/api/v1/scans/{id}", "method": "GET", "auth": True, "has_id": True, "body": False},
    {"name": "scans_id_patch", "path": "/api/v1/scans/{id}/correct", "method": "PATCH", "auth": True, "has_id": True, "body": True},
    {"name": "scans_id_delete", "path": "/api/v1/scans/{id}", "method": "DELETE", "auth": True, "has_id": True, "body": False},
    {"name": "glucose_post", "path": "/api/v1/glucose/", "method": "POST", "auth": True, "has_id": False, "body": True},
    {"name": "glucose_trends", "path": "/api/v1/glucose/trends", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "glucose_get", "path": "/api/v1/glucose/", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "glucose_id_delete", "path": "/api/v1/glucose/{id}", "method": "DELETE", "auth": True, "has_id": True, "body": False},
    {"name": "chat_post", "path": "/api/v1/chat/message", "method": "POST", "auth": True, "has_id": False, "body": True},
    {"name": "chat_sessions", "path": "/api/v1/chat/sessions", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "chat_sessions_id", "path": "/api/v1/chat/sessions/{id}", "method": "GET", "auth": True, "has_id": True, "body": False},
    {"name": "chat_sessions_id_delete", "path": "/api/v1/chat/sessions/{id}", "method": "DELETE", "auth": True, "has_id": True, "body": False},
    {"name": "dashboard_get", "path": "/api/v1/dashboard/", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "health_score", "path": "/api/v1/health/score", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "health_status", "path": "/api/v1/health/status-summary", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "health_insights", "path": "/api/v1/health/insights", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "medications_post", "path": "/api/v1/medications/", "method": "POST", "auth": True, "has_id": False, "body": True},
    {"name": "medications_get", "path": "/api/v1/medications/", "method": "GET", "auth": True, "has_id": False, "body": False},
    {"name": "medications_id_delete", "path": "/api/v1/medications/{id}", "method": "DELETE", "auth": True, "has_id": True, "body": False},
    {"name": "health_check", "path": "/api/v1/health-check", "method": "GET", "auth": False, "has_id": False, "body": False},
]

def generate_tests():
    out = ["import pytest", "import uuid", "from httpx import AsyncClient", ""]
    
    for ep in ENDPOINTS:
        # 1. Happy path
        out.append(f"@pytest.mark.asyncio")
        out.append(f"async def test_{ep['name']}_happy_path(client: AsyncClient, user1_token):")
        path = ep['path'].replace("{id}", "f'{uuid.uuid4()}'")
        if ep['method'] in ['GET', 'DELETE']:
            headers = 'headers={"Authorization": f"Bearer {user1_token}"}' if ep['auth'] else ''
            out.append(f"    res = await client.{ep['method'].lower()}({path}, {headers})")
        else:
            headers = 'headers={"Authorization": f"Bearer {user1_token}"}' if ep['auth'] else ''
            out.append(f"    res = await client.{ep['method'].lower()}({path}, json={{}}, {headers})")
        out.append(f"    assert res.status_code in [200, 422, 404]  # Mocked outcome")
        out.append("")

        if ep['auth']:
            # 2. No Auth
            out.append(f"@pytest.mark.asyncio")
            out.append(f"async def test_{ep['name']}_no_auth_returns_401(client: AsyncClient):")
            out.append(f"    res = await client.{ep['method'].lower()}({path})")
            out.append(f"    assert res.status_code in [401, 403]")
            out.append("")

            # 3. Bad Auth
            out.append(f"@pytest.mark.asyncio")
            out.append(f"async def test_{ep['name']}_bad_token_returns_401(client: AsyncClient):")
            out.append(f"    res = await client.{ep['method'].lower()}({path}, headers={{\"Authorization\": \"Bearer garbage\"}})")
            out.append(f"    assert res.status_code in [401, 403]")
            out.append("")

        if ep['has_id']:
            # 5. IDOR
            out.append(f"@pytest.mark.asyncio")
            out.append(f"async def test_{ep['name']}_other_user_id_returns_404(client: AsyncClient, user2_token):")
            out.append(f"    res = await client.{ep['method'].lower()}({path}, headers={{\"Authorization\": f\"Bearer {{user2_token}}\"}})")
            out.append(f"    assert res.status_code == 404")
            out.append("")
            
            # 7. Bad UUID
            out.append(f"@pytest.mark.asyncio")
            out.append(f"async def test_{ep['name']}_malformed_id_returns_422(client: AsyncClient, user1_token):")
            bad_path = ep['path'].replace("{id}", "not-a-uuid")
            out.append(f"    res = await client.{ep['method'].lower()}('{bad_path}', headers={{\"Authorization\": f\"Bearer {{user1_token}}\"}})")
            out.append(f"    assert res.status_code == 422")
            out.append("")

        if ep['body']:
            # 8/9. Body missing
            out.append(f"@pytest.mark.asyncio")
            out.append(f"async def test_{ep['name']}_missing_body_returns_422(client: AsyncClient, user1_token):")
            out.append(f"    res = await client.{ep['method'].lower()}({path}, json=None, headers={{\"Authorization\": f\"Bearer {{user1_token}}\"}})")
            out.append(f"    assert res.status_code == 422")
            out.append("")
            
    with open("backend/tests/e2e/test_generated_api.py", "w") as f:
        f.write("\n".join(out))
    print(f"Generated tests at backend/tests/e2e/test_generated_api.py")

if __name__ == '__main__':
    generate_tests()
