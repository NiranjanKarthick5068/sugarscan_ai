#!/bin/bash
# SugarScan AI - VPS Deployment Script
# Run this on a fresh Ubuntu server (DigitalOcean, AWS, etc.)

echo "🚀 Starting SugarScan AI Server Deployment..."

# 1. Update and install prerequisites
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common git

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# 3. Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 4. Clone repository if not exists
if [ ! -d "SugarScanAI" ]; then
    echo "📦 Cloning Repository..."
    git clone https://github.com/Niranjan6699/SugarScanAI.git
fi

cd SugarScanAI

# 5. Set up environment variables
echo "🔑 Please create backend/.env with your Supabase keys before starting!"
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "Created backend/.env from example. PLEASE EDIT IT NOW."
fi

# 6. Start Services
echo "🔥 Starting Docker Compose..."
docker-compose up -d

echo "✅ Deployment Initialized!"
echo "Make sure to configure your domain and NGINX if you want HTTPS."
