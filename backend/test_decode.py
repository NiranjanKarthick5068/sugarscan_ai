import os
from jose import jwt

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5YndhYm5kdGlyZnpkbmRkb2JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYzMzY4OSwiZXhwIjoyMTAyMjA5Njg5fQ.uYeIadVIcqGlPI6Wrka7IX_e2wEuNa-qgFjBXiOwrfg"
secret = "buvfxLuP1h6RK8uI00YIm3UoTrYO0RdPDa64lNsTPqQHvbjvtMnGcJUoeEpp4xtiMfri7Kqq8oTMX72R4h+y9A=="

print("Header:", jwt.get_unverified_header(token))
try:
    # Try with raw string
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    print("Decoded raw:", payload)
except Exception as e:
    print("Raw string error:", e)

try:
    import base64
    decoded_secret = base64.b64decode(secret)
    payload = jwt.decode(token, decoded_secret, algorithms=["HS256"])
    print("Decoded base64:", payload)
except Exception as e:
    print("Base64 error:", e)
