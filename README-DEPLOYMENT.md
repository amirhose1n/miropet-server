# MiroPet API - Deployment Guide

This guide explains how to set up CI/CD for the MiroPet API using GitHub Actions.

## Prerequisites

### On Ubuntu Server:

1. Node.js and npm installed
2. Git installed
3. SSH access configured
4. PM2 installed globally

### On GitHub:

1. Repository with development branch
2. GitHub Actions enabled
3. Repository secrets configured

## Setup Instructions

### 1. Ubuntu Server Setup

```bash
# Install Node.js and npm (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Clone the repository
git clone https://github.com/yourusername/miropet-server.git
cd miropet-server

# Create environment file
cp env.example .env
# Edit .env with your production values
nano .env

# Make deployment script executable
chmod +x deploy.sh
```

### 2. GitHub Repository Secrets

Add these secrets in your GitHub repository (Settings > Secrets and variables > Actions):

- `HOST`: Your Ubuntu server IP address
- `USERNAME`: Your Ubuntu server username
- `SSH_KEY`: Your private SSH key for server access
- `PORT`: SSH port (usually 22)

### 3. Environment Variables

Create a `.env` file on your Ubuntu server with:

```env
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/miropet
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=production
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key-here
```

### 4. Initial Deployment

```bash
# On Ubuntu server
cd /home/username/miropet-server
./deploy.sh
```

## How It Works

### CI/CD Flow:

1. Push to `development` branch triggers GitHub Actions
2. GitHub Actions connects to Ubuntu server via SSH
3. Server pulls latest code, installs dependencies, builds, and restarts PM2 process
4. Application is automatically updated

### PM2 Setup:

- **Process Management**: PM2 handles application lifecycle
- **Auto-restart**: PM2 automatically restarts on crashes
- **Log Management**: PM2 provides log management

## Manual Deployment

If you need to deploy manually:

```bash
# On Ubuntu server
cd /home/username/miropet-server
./deploy.sh
```

## Monitoring

### Check Application Status:

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs miropet-api

# Check MongoDB status
sudo systemctl status mongod

# Test health endpoint
curl http://localhost:3001/health
```

### Useful Commands:

```bash
# View real-time logs
pm2 logs miropet-api --lines 100

# Restart the application
pm2 restart miropet-api

# Stop the application
pm2 stop miropet-api

# Start the application
pm2 start miropet-api
```

## Troubleshooting

### Common Issues:

1. **Port already in use**: Check if port 3001 is available
2. **MongoDB connection issues**: Ensure MongoDB service is running
3. **Build failures**: Check TypeScript compilation errors
4. **PM2 issues**: Ensure PM2 is installed globally

### Debug Commands:

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs miropet-api --lines 50

# Check MongoDB status
sudo systemctl status mongod

# Check Node.js version
node --version
```

## Security Notes

- Keep your `.env` file secure and never commit it to Git
- Use strong JWT secrets in production
- Regularly update Node.js and dependencies
- Monitor PM2 logs for any security issues
