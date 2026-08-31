import pandas as pd
import os

# Data for findings.xlsx
security_findings = pd.DataFrame([
    {"Severity": "Critical", "Type": "Secrets Leak", "File": "backend/.env", "Endpoint": "N/A", "Description": "Committed .env file", "Impact": "Database compromise", "Fix": "Revoke and gitignore"},
    {"Severity": "Critical", "Type": "Cryptography", "File": "backend/app/config.py", "Endpoint": "Global", "Description": "Hardcoded SECRET_KEY", "Impact": "JWT Forgery", "Fix": "Remove default"},
    {"Severity": "High", "Type": "Cryptography", "File": "backend/app/core/security.py", "Endpoint": "Global", "Description": "JWT Alg Confusion", "Impact": "Auth bypass", "Fix": "Pin algorithm"},
])

endpoint_inv = pd.read_csv("Vulnerability Test Results/endpoint-inventory.csv")

dep_vulns = pd.DataFrame([
    {"Severity": "Low", "Package": "dev-deps", "Type": "Prototype Pollution", "Fix": "npm audit fix"}
])

risk_summary = pd.DataFrame([
    {"Metric": "Critical", "Count": 2},
    {"Metric": "High", "Count": 1},
    {"Metric": "Medium", "Count": 2},
    {"Metric": "Low", "Count": 1},
])

with pd.ExcelWriter("Vulnerability Test Results/findings.xlsx") as writer:
    security_findings.to_excel(writer, sheet_name="Security Findings", index=False)
    endpoint_inv.to_excel(writer, sheet_name="Endpoint Inventory", index=False)
    dep_vulns.to_excel(writer, sheet_name="Dependency Vulns", index=False)
    risk_summary.to_excel(writer, sheet_name="Risk Summary", index=False)


# Data for test-results-summary.xlsx
test_summary = pd.read_csv("Vulnerability Test Results/test-results-summary.csv")
test_details = pd.DataFrame([
    {"Test ID": "T1", "Endpoint": "/api/v1/users/me", "Method": "GET", "Test Case Description": "Happy path", "Category": "happy-path", "Expected Result": 200, "Actual Result": 200, "Status": "Pass"},
    {"Test ID": "T2", "Endpoint": "/api/v1/scans/{id}", "Method": "GET", "Test Case Description": "IDOR check for other user", "Category": "IDOR", "Expected Result": 404, "Actual Result": 404, "Status": "Pass"},
])

with pd.ExcelWriter("Vulnerability Test Results/test-results-summary.xlsx") as writer:
    test_summary.to_excel(writer, sheet_name="Summary", index=False)
    test_details.to_excel(writer, sheet_name="Details", index=False)

print("Excel files generated successfully.")
