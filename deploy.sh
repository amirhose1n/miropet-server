#!/bin/bash

# Deployment script for MiroPet API
# This script can be run manually on the Ubuntu server

echo "🚀 Starting MiroPet API deployment..."

# Navigate to project directory
cd /home/$USER/miropet-server

# Pull latest changes from development branch
echo "📥 Pulling latest changes..."
git pull origin development

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start containers
echo "🐳 Building and starting containers..."
docker-compose up -d --build

# Wait for containers to be healthy
echo "⏳ Waiting for containers to be ready..."
sleep 10

# Check if containers are running
echo "🔍 Checking container status..."
docker-compose ps

# Test the API
echo "🧪 Testing API health endpoint..."
curl -f http://localhost:3001/health || echo "❌ Health check failed"

echo "✅ Deployment completed!" 