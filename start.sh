#!/bin/bash

# Start Ollama in the background
echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be available
echo "Waiting for Ollama to start..."
while ! curl -s http://127.0.0.1:11434/api/tags > /dev/null; do
    sleep 1
done

# Pull required models if they don't exist
echo "Pulling Phi-3 Mini (if not exists)..."
ollama pull phi3:mini

echo "Pulling Moondream (if not exists)..."
ollama pull moondream

echo "All AI models are ready."

# Start FastAPI
echo "Starting FastAPI on port $PORT..."
cd /app
uvicorn app.main:app --host 0.0.0.0 --port $PORT
