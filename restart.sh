#!/bin/bash

echo "🔄 Restarting MiroPet API with fixes..."

# Navigate to project directory
cd /home/ubuntu/projects/miropet-server

# Pull latest changes
git pull origin development

# Install dependencies
npm install

# Build the application
npm run build

# Restart PM2 process
pm2 restart miropet-api || pm2 start dist/server.js --name miropet-api

echo "✅ Application restarted with fixes!"
echo "📊 Check logs: pm2 logs miropet-api" 