import * as argon2 from "argon2";

export default function register(ipcMain, db) {
  const { queryDb, runDb, pool } = db;

  ipcMain.handle("login-user", async (event, username, password) => {
    try {
      const rows = await queryDb(
        `SELECT user_id, password_hash, is_active, failed_attempts, locked_until, updated_at
         FROM users WHERE username = $1`,
        [username]
      );
  
      if (rows.length === 0) {
        return { success: false, error: "Invalid username or password." };
      }
  
      const user = rows[0];
  
      if (!user.is_active) {
        return { success: false, error: "Account is deactivated. Contact administrator." };
      }
  
      // ─── Reset failed_attempts if lock period has expired ───────────────────
      if (user.locked_until) {
        const now = new Date();
        const lockExpiredTime = new Date(user.locked_until);
        if (lockExpiredTime <= now) {
          await runDb(
            `UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1`,
            [user.user_id]
          );
          user.failed_attempts = 0;
          user.locked_until = null;
        }
      }
  
      // ─── Auto-reset failed_attempts if 24 hours have passed since last update ──
      const RESET_WINDOW_HOURS = 24;
      if (user.failed_attempts > 0 && user.updated_at) {
        const lastUpdate = new Date(user.updated_at);
        const now = new Date();
        const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
        if (hoursPassed >= RESET_WINDOW_HOURS) {
          await runDb(
            `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1`,
            [user.user_id]
          );
          user.failed_attempts = 0;
          user.locked_until = null;
        }
      }
  
      // UC-101 Alt Flow B — account lock check
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesLeft = Math.max(1, Math.ceil(
          (new Date(user.locked_until) - new Date()) / (1e3 * 60)
        ));
        return {
          success: false,
          error: `Account temporarily locked. Please try again after ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`
        };
      }
  
      const passwordMatch = await argon2.verify(user.password_hash, password);
  
      if (!passwordMatch) {
        const newFailCount = (user.failed_attempts || 0) + 1;
        const lockUntil = newFailCount >= 5
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null;
  
        await runDb(
          `UPDATE users
           SET failed_attempts = $1, locked_until = $2, updated_at = now()
           WHERE user_id = $3`,
          [newFailCount, lockUntil, user.user_id]
        );
  
        if (newFailCount >= 5) {
          const minutesLeft = Math.max(1, Math.ceil(
            (new Date(lockUntil) - new Date()) / (1000 * 60)
          ));
          return {
            success: false,
            error: `Account temporarily locked. Please try again after ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
          };
        }
  
        return { success: false, error: "Invalid username or password." };
      }
  
      // Successful login — reset counters
      await runDb(
        `UPDATE users
         SET failed_attempts = 0, locked_until = NULL,
             last_login_at = now(), updated_at = now()
         WHERE user_id = $1`,
        [user.user_id]
      );
  
      return { success: true, userId: user.user_id };
    } catch (err) {
      console.error("❌ login-user error:", err.message);
      return { success: false, error: "Service unavailable. Contact administrator." };
    }
  });

  ipcMain.handle("signup-user", async (event, username, password) => {
    try {
      const existing = await queryDb(
        `SELECT user_id FROM users WHERE username = $1`, [username]
      );
      if (existing.length > 0) {
        return { success: false, error: "Username already exists." };
      }
  
      const hash = await argon2.hash(password, { type: argon2.argon2id });
  
      const result = await runDb(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2) RETURNING user_id`,
        [username, hash]
      );
      return { success: true, userId: result.row.user_id };
    } catch (err) {
      console.error("❌ signup-user error:", err.message);
      return { success: false, error: "Service unavailable. Contact administrator." };
    }
  });
}
