# SugarScan AI — Backend (AI Inference Only)
# After Supabase migration, FastAPI handles ONLY:
#   - Vision analysis (moondream via Ollama)
#   - Chat streaming (phi3-mini via Ollama)
#   - Writing results back to Supabase via service-role key

FROM python:3.11-slim

# System deps for Pillow / image processing / Whisper audio extraction
RUN apt-get update && apt-get install -y \
    libpq-dev gcc libffi-dev ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
