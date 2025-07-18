# MiroPet API - Deployment Guide

This guide explains how to set up CI/CD for the MiroPet API using Docker and GitHub Actions.

## Prerequisites

### On Ubuntu Server:

1. Docker and Docker Compose installed
2. Git installed
3. SSH access configured
4. Node.js and npm (for local development)

### On GitHub:

1. Repository with development branch
2. GitHub Actions enabled
3. Repository secrets configured

## Setup Instructions

### 1. Ubuntu Server Setup

```bash
# Install Docker (if not already installed)
sudo apt update
sudo apt install docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

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
3. Server pulls latest code, installs dependencies, builds, and restarts containers
4. Application is automatically updated

### Docker Setup:

- **App Container**: Node.js application with TypeScript build
- **MongoDB Container**: Database with persistent volume
- **Network**: Isolated network for container communication

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
# Check container status
docker-compose ps

# Check application logs
docker-compose logs app

# Check database logs
docker-compose logs mongodb

# Test health endpoint
curl http://localhost:3001/health
```

### Useful Commands:

```bash
# View real-time logs
docker-compose logs -f app

# Restart only the app container
docker-compose restart app

# Stop all containers
docker-compose down

# Start all containers
docker-compose up -d
```

## Troubleshooting

### Common Issues:

1. **Port already in use**: Check if port 3001 is available
2. **MongoDB connection issues**: Ensure MongoDB container is running
3. **Build failures**: Check TypeScript compilation errors
4. **Permission issues**: Ensure user has docker group access

### Debug Commands:

```bash
# Check Docker status
sudo systemctl status docker

# Check container resources
docker stats

# Enter app container for debugging
docker-compose exec app sh
```

## Security Notes

- Keep your `.env` file secure and never commit it to Git
- Use strong JWT secrets in production
- Consider using Docker secrets for sensitive data
- Regularly update Docker images and dependencies
