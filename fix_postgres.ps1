$pgHba = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
$content = Get-Content $pgHba
$content = $content -replace 'scram-sha-256', 'trust'
$content | Set-Content $pgHba

# Reload Postgres config
Restart-Service -Name "postgresql-x64-18" -Force

$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
[System.Environment]::SetEnvironmentVariable("PATH", $env:PATH, "Machine")

# Create Database and Extension
psql -U postgres -c "CREATE DATABASE sugarscan;"
psql -U postgres -d sugarscan -c "CREATE EXTENSION IF NOT EXISTS `"uuid-ossp`";"

# Revert pg_hba (optional, but let's just keep it trust for local dev for now so the app can connect without password)
