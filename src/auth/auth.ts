import { randomBytes, createHash } from 'node:crypto';
import argon2 from 'argon2';
import { query } from '../db/db.js';

// Session lifetimes
const ACTIVE_EXPIRES_SECONDS = 7 * 24 * 60 * 60; // 7 days
const IDLE_EXPIRES_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Brute-force / lockout controls
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes

async function burnPasswordTime(password: string): Promise<void> {
  await hashPassword(password || 'dummy');
}

function hashUserAgent(userAgent: string | undefined | null): string | null {
  if (!userAgent) return null;
  return createHash('sha256').update(userAgent).digest('hex');
}

/**
 * Hashes a plaintext password using Argon2id with custom parameters.
 * Used during password creation and updates.
 * 
 * @param plain - The plaintext password to hash
 * @returns A promise that resolves to the Argon2id password hash
 */
export async function hashPassword(plain: string): Promise<string> {
  // Explicitly use argon2id with custom parameters for easier migration to other argon2 providers if needed, and to ensure consistent hashing across environments.
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Safely verifies a plaintext password against a stored Argon2id hash.
 * Returns false on any error to prevent timing attacks.
 * 
 * @param hash - The stored Argon2id password hash
 * @param plain - The plaintext password to verify
 * @returns A promise that resolves to true if the password matches, false otherwise
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure random session ID.
 * 
 * @param len - The length of the ID in hex characters (default: 64)
 * @returns A random hex string of the specified length
 */
export function generateId(len = 64): string {
  return randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

/**
 * Returns secure cookie configuration for session cookies.
 * 
 * Configuration includes:
 * - HttpOnly: Cookies cannot be accessed by JavaScript
 * - SameSite: Strict to prevent CSRF attacks
 * - Secure: Set to true in production, configurable in development
 * - Path: / (root path only)
 * - MaxAge: 30 days (IDLE_EXPIRES_SECONDS)
 * 
 * @param secureFlag - Whether to set the secure flag in development
 * @returns Cookie configuration object
 */
export function sessionCookieOptions(secureFlag: boolean) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd ? true : secureFlag;

  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure,
    maxAge: IDLE_EXPIRES_SECONDS,
    path: '/',
  };
}

/**
 * Creates a new session in the database and returns the session ID.
 * 
 * Stores user agent hash for hijacking detection. Sets two expiration times:
 * - Active expires: 7 days (refreshed on each valid request)
 * - Idle expires: 30 days (absolute, no refresh)
 * 
 * @param userId - The ID of the user to create a session for
 * @param userAgent - Optional user agent string for session validation
 * @returns A promise that resolves to the new session ID
 */
export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const sessionId = generateId(64);
  const now = new Date();
  const activeExpires = new Date(now.getTime() + ACTIVE_EXPIRES_SECONDS * 1000);
  const idleExpires = new Date(now.getTime() + IDLE_EXPIRES_SECONDS * 1000);
  const uaHash = hashUserAgent(userAgent);

  await query(
    'INSERT INTO user_session (id, user_id, active_expires, idle_expires, ua_hash) VALUES ($1, $2, $3, $4, $5)',
    [sessionId, userId, activeExpires, idleExpires, uaHash]
  );

  return sessionId;
}

/**
 * Validates a session and returns the user ID if valid.
 * 
 * Performs the following checks:
 * - Session exists in database
 * - Idle expiration hasn't passed (30 days absolute)
 * - User agent hash matches the original (prevents hijacking)
 * - Active expiration and refreshes if needed (7 days rolling)
 * 
 * Automatically invalidates the session if it fails any check.
 * 
 * @param sessionId - The session ID to validate
 * @param userAgent - Optional user agent string to verify against stored hash
 * @returns A promise that resolves to an object with userId if valid, null if invalid or expired
 */
export async function getSession(
  sessionId: string,
  userAgent?: string
): Promise<{ userId: string; } | null> {
  if (!sessionId) {
    return null;
  }

  const result = await query(
    'SELECT user_id, active_expires, idle_expires, ua_hash FROM user_session WHERE id = $1',
    [sessionId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const session = result.rows[0] as {
    user_id: string;
    active_expires: Date | string;
    idle_expires: Date | string;
    ua_hash: string | null;
  };

  const now = new Date();
  const idleExpires = new Date(session.idle_expires);
  const activeExpires = new Date(session.active_expires);

  if (idleExpires <= now) {
    await invalidateSession(sessionId);
    return null;
  }

  const expectedUaHash = session.ua_hash;
  const currentUaHash = hashUserAgent(userAgent);
  if (expectedUaHash && expectedUaHash !== currentUaHash) {
    await invalidateSession(sessionId);
    return null;
  }

  if (activeExpires <= now) {
    const refreshedActiveExpires = new Date(now.getTime() + ACTIVE_EXPIRES_SECONDS * 1000);
    await query('UPDATE user_session SET active_expires = $1 WHERE id = $2', [refreshedActiveExpires, sessionId]);
  }

  return { userId: session.user_id };
}

/**
 * Immediately invalidates a session by deleting it from the database.
 * 
 * @param sessionId - The session ID to invalidate
 * @returns A promise that resolves when the session has been deleted
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await query('DELETE FROM user_session WHERE id = $1', [sessionId]);
}

/**
 * Authenticates a user and creates a session.
 * 
 * Implements brute-force protection with account lockout after 5 failed attempts
 * within a 15-minute window. Uses constant-time password hashing even for non-existent
 * users to prevent timing attacks.
 * 
 * @param username - The username to authenticate
 * @param password - The plaintext password to verify
 * @param userAgent - Optional user agent string for session creation
 * @returns A promise that resolves to an object with userId, sessionId, and mustResetPassword flag
 *          on successful authentication, or null if credentials are invalid, user doesn't exist,
 *          or account is locked out
 */
export async function login(
  username: string,
  password: string,
  userAgent?: string
): Promise<{
  userId: string;
  sessionId: string;
  mustResetPassword: boolean;
} | null> {
  const result = await query(
    `SELECT
       u.id AS user_id,
       u.must_reset_password,
       u.failed_attempts,
       u.lockout_until,
       p.password_hash
     FROM app_user u
     JOIN user_password p ON p.user_id = u.id
     WHERE u.username = $1`,
    [username]
  );

  if (result.rowCount === 0) {
    await burnPasswordTime(password);
    return null;
  }

  const row = result.rows[0] as {
    user_id: string;
    must_reset_password: boolean;
    password_hash: string;
    failed_attempts: number;
    lockout_until: Date | string | null;
  };

  const now = new Date();
  const lockoutUntil = row.lockout_until ? new Date(row.lockout_until) : null;

  if (lockoutUntil && lockoutUntil > now) {
    await burnPasswordTime(password);
    return null;
  }

  const isValid = await verifyPassword(row.password_hash, password);

  if (!isValid) {
    const failedAttempts = (row.failed_attempts ?? 0) + 1;
    let newLockoutUntil: Date | null = null;

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      newLockoutUntil = new Date(now.getTime() + LOCKOUT_WINDOW_SECONDS * 1000);
    }

    await query(
      'UPDATE app_user SET failed_attempts = $1, lockout_until = $2 WHERE id = $3',
      [failedAttempts, newLockoutUntil, row.user_id]
    );

    return null;
  }

  await query(
    'UPDATE app_user SET failed_attempts = 0, lockout_until = NULL WHERE id = $1',
    [row.user_id]
  );

  const sessionId = await createSession(row.user_id, userAgent);
  return {
    userId: row.user_id,
    sessionId,
    mustResetPassword: row.must_reset_password,
  };
}

/**
 * Updates a user's password hash and clears the password reset flag.
 * 
 * Invalidates all existing sessions for the user to force re-authentication.
 * 
 * @param userId - The ID of the user to update
 * @param newPassword - The new plaintext password to hash and store
 * @returns A promise that resolves when the password has been updated
 */
export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);

  await query('UPDATE user_password SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
  await query('UPDATE app_user SET must_reset_password = FALSE WHERE id = $1', [userId]);
  await query('DELETE FROM user_session WHERE user_id = $1', [userId]);
}
