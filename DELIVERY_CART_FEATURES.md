# Cart & Delivery Method Features

## Overview

This document describes the new features implemented for cart management and delivery method selection in the MiroPet e-commerce system.

## Features Implemented

### 1. Enhanced Login with Cart Merging

**Requirement**: Login API should accept sessionId to merge guest cart items with user cart upon login.

**Implementation**:

- Updated login endpoint to accept optional `sessionId` parameter
- When user logs in with a sessionId, the system automatically:
  - Finds the guest cart associated with that sessionId
  - Merges guest cart items with the user's existing cart
  - Removes the guest cart after successful merge
  - Returns `cartMerged` flag in the response

**API Usage**:

```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "sessionId": "guest-session-id" // Optional
}
```

**Response includes**:

```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt-token",
    "cartMerged": true // Indicates if cart was merged
  }
}
```

### 2. Checkout Authentication Requirement

**Requirement**: Checkout should require user authentication.

**Implementation**:

- Checkout endpoint (`POST /api/orders/checkout`) already requires authentication via `auth` middleware
- Users must be logged in to proceed with checkout
- Guest users cannot checkout - they must register/login first

### 3. Delivery Method Management

**Requirement**: New DeliveryMethod model with admin management capabilities.

**Model Structure**:

```typescript
interface IDeliveryMethod {
  name: string;
  subtitle?: string;
  price: number;
  validationDesc?: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId; // Admin who created
  updatedBy: ObjectId; // Admin who last updated
}
```

**Admin Operations**:

- ✅ Create new delivery methods
- ✅ Edit existing delivery methods
- ✅ Delete delivery methods
- ✅ Enable/disable delivery methods
- ✅ List all delivery methods with pagination and search

**Customer Operations**:

- ✅ View enabled delivery methods only
- ✅ Select delivery method during checkout

### 4. Enhanced Order Model

**Updated Order Model**:

- Added `deliveryMethodId` field (reference to DeliveryMethod)
- Added `deliveryMethodName` field (stored for historical data)
- Added `deliveryMethodPrice` field (stored for historical data)

### 5. Updated Checkout Process

**Enhanced Checkout**:

- Accepts optional `deliveryMethodId` in checkout request
- Validates delivery method exists and is enabled
- Calculates shipping cost based on selected delivery method
- Falls back to default shipping logic if no delivery method selected
- Stores delivery method information in order for historical tracking

## API Endpoints

### Delivery Methods

#### Public Endpoints (Customers)

```
GET /api/delivery-methods                    # Get enabled delivery methods
GET /api/delivery-methods/:id               # Get specific delivery method
```

#### Admin Endpoints

```
GET /api/delivery-methods/admin/all         # Get all delivery methods (with filters)
POST /api/delivery-methods/admin            # Create new delivery method
PUT /api/delivery-methods/admin/:id         # Update delivery method
DELETE /api/delivery-methods/admin/:id      # Delete delivery method
PATCH /api/delivery-methods/admin/:id/toggle # Toggle enable/disable status
```

#### Enhanced Auth Endpoints

```
POST /api/auth/login                         # Login with optional sessionId for cart merge
```

#### Enhanced Order Endpoints

```
POST /api/orders/checkout                    # Checkout with optional deliveryMethodId
```

## Default Delivery Methods

The system seeds the following default delivery methods:

1. **ارسال عادی** (Standard Shipping) - 50,000 IRR
2. **ارسال رایگان** (Free Shipping) - 0 IRR (for orders >500,000 IRR)
3. **ارسال فوری** (Express Shipping) - 150,000 IRR
4. **پیک موتوری** (Motorcycle Courier) - 80,000 IRR
5. **باربری** (Freight) - 200,000 IRR (disabled by default)

## Security & Validation

### Input Validation

- All delivery method inputs are validated using express-validator
- Name: Required, max 100 characters
- Subtitle: Optional, max 200 characters
- Price: Required, positive number
- ValidationDesc: Optional, max 500 characters
- isEnabled: Optional boolean

### Authorization

- Admin-only operations require `adminAuth` middleware
- Customer operations use `auth` middleware where needed
- Public endpoints (viewing delivery methods) are accessible without auth

### Data Integrity

- Delivery method references in orders are stored as both ID and name/price for historical data
- Cart merging handles edge cases and conflicts gracefully
- Failed cart merges don't prevent successful login

## Usage Examples

### 1. Customer Workflow

```javascript
// 1. Guest adds items to cart
POST /api/cart/add
Headers: { "cart-session-id": "guest-123" }

// 2. Guest decides to checkout -> redirected to login
// 3. User logs in with sessionId
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "sessionId": "guest-123"
}

// 4. User selects delivery method and checks out
GET /api/delivery-methods  // View available methods

POST /api/orders/checkout
{
  "shippingAddress": {...},
  "deliveryMethodId": "delivery-method-id",
  "paymentMethod": "card"
}
```

### 2. Admin Workflow

```javascript
// 1. Create new delivery method
POST /api/delivery-methods/admin
Authorization: Bearer admin-token
{
  "name": "Same Day Delivery",
  "subtitle": "Delivered within 24 hours",
  "price": 100000,
  "validationDesc": "Available in major cities only"
}

// 2. Disable a delivery method
PATCH /api/delivery-methods/admin/:id/toggle
Authorization: Bearer admin-token

// 3. View delivery method usage statistics
GET /api/delivery-methods/admin/all?page=1&limit=10
Authorization: Bearer admin-token
```

## Testing

Use the provided `test-delivery-api.http` file to test all endpoints. Replace placeholder values:

- `YOUR_ADMIN_TOKEN`: JWT token for admin user
- `YOUR_CUSTOMER_TOKEN`: JWT token for customer user
- `DELIVERY_METHOD_ID`: Actual delivery method ID from database

## Database Indexes

The following indexes are created for optimal performance:

- `DeliveryMethod.isEnabled` - for filtering enabled methods
- `DeliveryMethod.name` - for searching by name
- `Order.deliveryMethodId` - for delivery method usage analytics

## Error Handling

The system handles various error scenarios:

- Invalid delivery method selection during checkout
- Disabled delivery method selection
- Cart merge failures (logged but don't prevent login)
- Missing authentication for protected operations
- Validation errors for all inputs

All errors return consistent JSON responses with appropriate HTTP status codes and descriptive messages.
