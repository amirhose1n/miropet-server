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

# Start the application using PM2
echo "🚀 Starting application with PM2..."
pm2 restart miropet-api || pm2 start dist/server.js --name miropet-api

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 5

# Check if application is running
echo "🔍 Checking application status..."
pm2 status

# Test the API
echo "🧪 Testing API health endpoint..."
curl -f http://localhost:3001/health || echo "❌ Health check failed"

echo "✅ Deployment completed!" 