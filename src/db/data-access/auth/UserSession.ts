import { query } from '../../utilities.js';

export type UserSession = {
  id: string;
  userId: string;
  uaHash: string | null;
  createdAt: Date;
  activeExpires: Date;
  idleExpires: Date;
};

export class UserSessionDAO {
  static async create(sessionId: string, userId: string, activeExpires: Date, idleExpires: Date, uaHash: string | null) {
    await query(
      'INSERT INTO user_session (id, user_id, active_expires, idle_expires, ua_hash) VALUES ($1, $2, $3, $4, $5)',
      [sessionId, userId, activeExpires, idleExpires, uaHash]
    );
  }

  static async delete(sessionId: string) {
    await query('DELETE FROM user_session WHERE id = $1', [sessionId]);
  }

  static async deleteByUserId(userId: string) {
    await query('DELETE FROM user_session WHERE user_id = $1', [userId]);
  }

  static async findById(sessionId: string): Promise<UserSession | null> {
    const result = await query('SELECT * FROM user_session WHERE id = $1', [sessionId]);
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      uaHash: row.ua_hash,
      createdAt: new Date(row.created_at),
      activeExpires: new Date(row.active_expires),
      idleExpires: new Date(row.idle_expires),
    };
  }

  static async updateActiveExpires(sessionId: string, newActiveExpires: Date) {
    await query('UPDATE user_session SET active_expires = $1 WHERE id = $2', [newActiveExpires, sessionId]);
  }
}
