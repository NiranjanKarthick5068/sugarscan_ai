# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV OLLAMA_HOST=0.0.0.0

# Install system dependencies including curl and Ollama
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY backend/requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code into the container
COPY backend/ /app/

# Copy the startup script
COPY start.sh /app/
RUN chmod +x /app/start.sh

# Expose the ports for FastAPI
EXPOSE 8000

# Start the application
CMD ["/app/start.sh"]
