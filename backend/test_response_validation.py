from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    name: str

@app.get("/", response_model=User)
def test():
    return {"wrong": 1}

client = TestClient(app, raise_server_exceptions=False)
response = client.get("/")
print("Status:", response.status_code)
print("Body:", response.json())
