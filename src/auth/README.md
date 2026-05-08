# Auth Module

The `auth.ts` module provides secure authentication and session management for the Campsite Report application. It implements custom password hashing, session validation, and brute-force protection without external auth dependencies.

## Features

### Password Security
- **Argon2id Hashing**: Uses Argon2id with custom memory cost (19456), time cost (2), and parallelism (1) for consistent, secure password hashing
- **Constant-Time Verification**: Safely verifies passwords even when users don't exist (`burnPasswordTime`) to prevent timing attacks
- **Password Reset**: Users can update passwords, which invalidates all existing sessions

### Session Management
- **Two-Tier Expiration**:
  - **Active Expires**: 7 days of actual usage before session refresh required
  - **Idle Expires**: 30 days of inactivity before automatic logout
- **User Agent Validation**: Sessions are tied to the original user agent (hashed SHA-256) to detect session hijacking
- **Session Refresh**: Active expiration time is automatically refreshed on each valid request

### Brute-Force Protection
- **Failed Attempt Tracking**: Tracks consecutive failed login attempts per user
- **Account Lockout**: After 5 failed attempts, the account locks for 15 minutes
- **Transparent Timing**: Locked-out accounts still consume password hashing time to prevent timing attacks

### Session Cookie Security
- **HttpOnly**: Cookies cannot be accessed by JavaScript
- **SameSite: Strict**: Prevents CSRF attacks
- **Secure Flag**: Set in production, configurable in development
- **Path: /**: Cookie only sent for root path requests

## Usage in Application Flow

1. **First-Time Setup**: Admin visits the site, enters the initial password from setup, then is prompted to create a new password via `hashPassword()` and `updatePassword()`

2. **Login**: User submits credentials to `login()`, which validates against stored hash and creates a session

3. **Protected Routes**: Each request checks `getSession()` to verify the session is valid and hasn't expired

4. **Session Expiration**: Sessions automatically refresh active expiration on each request, but invalidate after 30 days of inactivity or when active usage hits 7 days

5. **Logout/Force Reset**: `invalidateSession()` or `updatePassword()` clears sessions, forcing re-authentication

## Database Schema

This module requires these tables (defined in migrations):
- `app_user`: Stores username, user ID, failed login attempts, lockout time, and password reset flag
- `user_password`: Stores the password hash for each user
- `user_session`: Stores active sessions with user ID, expiration times, and user agent hash

## Security Considerations

- All session IDs and passwords are never logged or exposed in error messages
- User agent hashes are stored instead of raw user agents
- Password verification uses constant-time comparison via Argon2
- Account lockout provides protection against brute-force attacks
- Idle sessions expire after 30 days regardless of activity
- Active sessions refresh but require re-authentication after 7 days of continuous use
