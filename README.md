# MiroPet API

A RESTful API for a pet store built with Express.js, TypeScript, and MongoDB.

## Features

- JWT Authentication with role-based access (Admin/Customer)
- User management with addresses
- Product management with pagination and filtering
- MongoDB integration with Mongoose
- TypeScript for type safety
- Input validation and sanitization
- Rate limiting and security headers

## Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment variables:

   ```bash
   cp env.example .env
   ```

4. Update the `.env` file with your MongoDB connection string and JWT secret

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will run on port 3001.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Products

- `GET /api/products` - Get all products (with pagination and filtering)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin only)

### Users

- `GET /api/users/profile` - Get user profile (Authenticated)

## Environment Variables

- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT token expiration time
- `NODE_ENV` - Environment (development/production)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
