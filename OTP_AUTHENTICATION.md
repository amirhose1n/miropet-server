# OTP Authentication System with Refresh Tokens

This document describes the OTP-based authentication system implemented using SMS.ir API with refresh token support.

## Overview

The authentication system uses OTP (One-Time Password) sent via SMS instead of traditional email/password authentication. This provides a more secure and user-friendly authentication experience with proper token management.

## Features

- **Phone-based Authentication**: Users authenticate using their Iranian mobile phone numbers
- **OTP Verification**: SMS codes are sent via SMS.ir API for verification
- **Automatic User Creation**: New users are automatically created upon successful OTP verification
- **Refresh Token Support**: Secure token refresh mechanism for better security
- **Profile Management**: Users can update their profile information after authentication
- **No Passwords**: Completely password-free authentication system
- **Cart Merging**: Guest cart items are merged when users log in
- **Rate Limiting**: Built-in protection against OTP abuse
- **Multi-device Support**: Users can be logged in on multiple devices

## API Endpoints

### 1. Send OTP

**POST** `/api/auth/send-otp`

Sends an OTP to the provided phone number.

**Request Body:**

```json
{
  "phone": "09123456789"
}
```

**Response:**

```json
{
  "success": true,
  "message": "کد تایید با موفقیت ارسال شد",
  "data": {
    "phone": "09123456789",
    "expiresIn": 300
  }
}
```

**Rate Limiting:**

- Maximum 3 attempts per phone number
- 1 minute cooldown between OTP requests
- OTP expires after 5 minutes

### 2. Verify OTP

**POST** `/api/auth/verify-otp`

Verifies the OTP and logs in/registers the user.

**Request Body:**

```json
{
  "phone": "09123456789",
  "otp": "12345",
  "name": "User Name", // Optional
  "sessionId": "guest-session-id" // Optional, for cart merging
}
```

**Response:**

```json
{
  "success": true,
  "message": "ورود با موفقیت انجام شد",
  "data": {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "phone": "09123456789",
      "email": null,
      "role": "customer",
      "isPhoneVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "jwt_access_token_here",
    "refreshToken": "refresh_token_here",
    "cartMerged": false,
    "isNewUser": false
  }
}
```

### 3. Update Profile

**POST** `/api/auth/update-profile`

Updates user profile information. Requires authentication.

**Request Body:**

```json
{
  "name": "Updated Name", // Optional
  "email": "user@example.com" // Optional
}
```

**Headers:**

```
Authorization: Bearer <jwt_token>
```

### 4. Refresh Token

**POST** `/api/auth/refresh-token`

Refreshes the access token using a valid refresh token.

**Request Body:**

```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_access_token_here",
    "refreshToken": "new_refresh_token_here"
  }
}
```

### 5. Logout

**POST** `/api/auth/logout`

Logs out the user by invalidating refresh tokens. Requires authentication.

**Request Body:**

```json
{
  "refreshToken": "refresh_token_here" // Optional - if not provided, logs out from all devices
}
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "message": "خروج با موفقیت انجام شد"
}
```

## Database Schema Changes

### User Model Updates

- `email` is now optional
- `phone` field added (unique, sparse index)
- `passwordHash` field removed (no passwords)
- `refreshTokens` array field added for token management
- `isPhoneVerified` field added
- `updatedAt` field added

### New OTP Session Model

```typescript
interface IOTPSession {
  phone: string;
  otp: string;
  attempts: number;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}
```

## SMS.ir Integration

### Configuration

The system uses SMS.ir API for sending OTP messages. Configuration is done via environment variables:

```env
SMS_IR_API_KEY=cQCicmk3DounGa8l6THCbCxUaMqtQSYtqlCHB9FPbaLfk5mF
SMS_IR_TEMPLATE_ID=905649
```

### SMS Template

The SMS template should include a placeholder for the OTP code:

```
Your verification code is: #code#
```

### Phone Number Validation

The system validates Iranian mobile numbers in the following formats:

- `09123456789` (standard format)
- `+989123456789` (with country code)
- `989123456789` (without + prefix)

## Security Features

1. **OTP Expiration**: OTPs expire after 5 minutes
2. **Attempt Limiting**: Maximum 3 attempts per OTP session
3. **Rate Limiting**: 1 minute cooldown between OTP requests
4. **Phone Verification**: Users must verify their phone number
5. **JWT Tokens**: Secure token-based authentication
6. **Input Validation**: Comprehensive validation for all inputs

## Error Handling

The system provides detailed error messages in Persian for better user experience:

- Invalid phone number format
- OTP expired or not found
- Too many attempts
- Rate limiting exceeded
- SMS service errors

## Migration Notes

### For Existing Users

- Existing users with email/password can still use the system
- New users will be created with phone-based authentication
- The system supports both authentication methods

### Database Migration

- No data loss occurs during migration
- Existing user data is preserved
- New fields are added with appropriate defaults

## Testing

Use the provided `test-otp-auth.http` file to test the authentication flow:

1. Send OTP to a test phone number
2. Verify the OTP (check SMS for actual code)
3. Test profile updates
4. Test password management

## Environment Variables

Add these to your `.env` file:

```env
# SMS.ir API Configuration
SMS_IR_API_KEY=cQCicmk3DounGa8l6THCbCxUaMqtQSYtqlCHB9FPbaLfk5mF
SMS_IR_TEMPLATE_ID=905649
```

## Dependencies

The following new dependency was added:

- `axios`: For making HTTP requests to SMS.ir API

## Future Enhancements

1. **Email OTP**: Add email-based OTP as an alternative
2. **Two-Factor Authentication**: Combine phone and email verification
3. **Biometric Authentication**: Add fingerprint/face recognition
4. **Social Login**: Integrate with social media platforms
5. **Advanced Rate Limiting**: Implement more sophisticated rate limiting
6. **Audit Logging**: Track authentication attempts and security events
