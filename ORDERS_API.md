# Orders & Checkout API Documentation

## Overview

This API provides a complete checkout and order management system for MiroPet e-commerce platform with fake payment integration.

## Order Status Flow

```
submitted → inProgress → posted → done
     ↓
  canceled (only before 'posted')
```

## Payment Status

- `pending` - Payment not processed yet
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded (when order canceled)

## API Endpoints

### Customer Endpoints

#### POST /api/orders/checkout

**Description**: Checkout cart and create order with payment processing
**Auth**: Required (customer)
**Body**:

```json
{
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "+98912345678",
    "street": "123 Main St",
    "city": "Tehran",
    "postalCode": "12345",
    "country": "Iran",
    "notes": "Optional delivery notes"
  },
  "billingAddress": {
    /* Optional, defaults to shipping */
  },
  "paymentMethod": "card|cash|bank_transfer",
  "customerNotes": "Optional order notes"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Order created and payment processed successfully",
  "data": {
    "order": {
      "_id": "order_id",
      "orderNumber": "MP12345678001",
      "totalAmount": 150000,
      "status": "inProgress",
      "paymentStatus": "paid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "payment": {
      "transactionId": "TX1234567890001",
      "status": "completed"
    }
  }
}
```

#### GET /api/orders/my-orders

**Description**: Get current user's orders
**Auth**: Required (customer)
**Query Parameters**:

- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (submitted|inProgress|posted|done|canceled)
- `paymentStatus` (pending|paid|failed|refunded)

#### GET /api/orders/:id

**Description**: Get order details by ID
**Auth**: None (can be accessed by customer with order ID)

#### PATCH /api/orders/:id/cancel

**Description**: Cancel order (only before 'posted' status)
**Auth**: None
**Body**:

```json
{
  "reason": "Changed my mind"
}
```

### Admin Endpoints

#### GET /api/orders

**Description**: Get all orders with advanced filtering
**Auth**: Required (admin)
**Query Parameters**:

- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (submitted|inProgress|posted|done|canceled)
- `paymentStatus` (pending|paid|failed|refunded)
- `userId` (string) - Filter by specific user
- `startDate` (ISO date) - Filter from date
- `endDate` (ISO date) - Filter to date
- `orderNumber` (string) - Search by order number
- `sortBy` (string, default: "createdAt") - Sort field
- `sortOrder` (asc|desc, default: "desc") - Sort direction

#### PATCH /api/orders/:id/status

**Description**: Update order status
**Auth**: Required (admin)
**Body**:

```json
{
  "status": "inProgress",
  "adminNotes": "Order processed and sent to warehouse",
  "trackingNumber": "TR123456789"
}
```

#### GET /api/orders/stats/summary

**Description**: Get order statistics
**Auth**: Required (admin)
**Response**:

```json
{
  "success": true,
  "data": {
    "orderStats": [
      { "_id": "submitted", "count": 10, "totalAmount": 1500000 },
      { "_id": "inProgress", "count": 5, "totalAmount": 750000 }
    ],
    "paymentStats": [
      { "_id": "paid", "count": 12, "totalAmount": 1800000 },
      { "_id": "pending", "count": 3, "totalAmount": 450000 }
    ],
    "totalOrders": 15,
    "totalRevenue": 1800000
  }
}
```

## Fake Payment Integration

The system includes a fake payment service that:

- Simulates 1-second processing time
- Has 90% success rate (10% random failures)
- Generates fake transaction IDs
- Can be easily replaced with real bank integration

### Payment Flow

1. Order created with status `submitted` and payment `pending`
2. Payment service processes payment
3. If successful: status → `inProgress`, payment → `paid`
4. If failed: payment → `failed`, order remains `submitted`

### To Integrate Real Bank

Replace the `PaymentService.processPayment()` method in `/controllers/order.controller.ts` with your bank's API integration.

## Features Implemented

✅ **Complete Checkout Flow** - Cart to order with payment
✅ **Order Status Management** - 5-stage status system  
✅ **Payment Processing** - Fake payment with real integration structure
✅ **Order Filtering** - Advanced search and filtering
✅ **Cancellation Logic** - Only before 'posted' status
✅ **Stock Management** - Automatic stock updates
✅ **Admin Dashboard** - Complete order management
✅ **Statistics** - Order and payment analytics
✅ **User Experience** - Customer order tracking

## Error Handling

The API includes comprehensive error handling for:

- Invalid cart items
- Insufficient stock
- Payment failures
- Invalid order status transitions
- Authentication/authorization errors
- Database errors

## Security

- JWT authentication for all protected routes
- Role-based access control (customer/admin)
- Input validation and sanitization
- Error message sanitization in production
