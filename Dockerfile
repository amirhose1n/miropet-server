# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install git for deployment
RUN apk add --no-cache git

# Expose port
EXPOSE 3001

# Keep container running but don't start the app
CMD ["tail", "-f", "/dev/null"] 