from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, ValidationError

app = FastAPI()

class User(BaseModel):
    name: str

@app.get("/")
def test():
    try:
        User.model_validate({"wrong": 1})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise

client = TestClient(app)
response = client.get("/")
print("Status:", response.status_code)
