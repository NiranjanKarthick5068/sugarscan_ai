# SugarScan AI — Production Monorepo

> Diabetes health app: scan food with AI vision, track glucose, chat with your health twin.

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 51, TypeScript, Expo Router v3 |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 async |
| AI Vision | Ollama — moondream |
| AI LLM | Ollama — phi3:mini |
| Auth | JWT (access 30min + refresh 7d) |

## Quick Start

### 1. Ollama Setup
```bash
ollama serve
ollama pull moondream
ollama pull phi3:mini
```

### 2. PostgreSQL Setup
```sql
CREATE DATABASE sugarscan;
\c sugarscan;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
cp .env.example .env        # edit DATABASE_URL + SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 4. Mobile
```bash
cd mobile
npm install
cp .env.example .env        # edit EXPO_PUBLIC_API_URL
npx expo start
```

## API Docs
Once backend is running: http://localhost:8000/docs

## Project Structure
```
SugarScanAI/
├── backend/       ← FastAPI + PostgreSQL
└── mobile/        ← React Native + Expo
```
