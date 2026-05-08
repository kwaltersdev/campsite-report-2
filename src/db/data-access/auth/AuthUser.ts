import { query } from "../../utilities";

export type AuthUser = {
  id: string;
  mustResetPassword: boolean;
  failedAttempts: number;
  lockoutUntil: Date | null;
  passwordHash: string;
};

export class AuthUserDAO {
  static async findByUsername(username: string): Promise<AuthUser | null> {
    const result = await query(
      `SELECT
        u.id,
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
      return null;
    }

    const authUser: AuthUser = {
      id: result.rows[0].id,
      mustResetPassword: result.rows[0].must_reset_password,
      failedAttempts: result.rows[0].failed_attempts,
      lockoutUntil: result.rows[0].lockout_until ? new Date(result.rows[0].lockout_until) : null,
      passwordHash: result.rows[0].password_hash
    };

    return authUser;
  }

  static async findMustResetPasswordById(userId: string): Promise<boolean | null> {
    const result = await query('SELECT must_reset_password FROM app_user WHERE id = $1', [userId]);
    if (!result.rowCount || result.rowCount <= 0) {
      return null;
    } else {
      return result.rows[0].must_reset_password;
    }
  }

  static async resetFailedAttemptsAndLockout(userId: string) {
    await query(
      'UPDATE app_user SET failed_attempts = 0, lockout_until = NULL WHERE id = $1',
      [userId]
    );
  }

  static async updateFailedAttemptsAndLockout(userId: string, failedAttempts: number, lockoutUntil: Date | null) {
    await query(
      'UPDATE app_user SET failed_attempts = $1, lockout_until = $2 WHERE id = $3',
      [failedAttempts, lockoutUntil, userId]
    );
  }

  static async updateMustResetPassword(userId: string, mustReset: boolean) {

    await query('UPDATE app_user SET must_reset_password = $1 WHERE id = $2', [mustReset, userId]);
  }

  static async updatePasswordHash(userId: string, passwordHash: string) {
    await query('UPDATE user_password SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
  }
}