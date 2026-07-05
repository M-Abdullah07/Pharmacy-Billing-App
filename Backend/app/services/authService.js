import * as argon2 from "argon2";
import { setSession, getSession, clearSession } from "./session.js";

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
  
      // H3/H4: establish server-side session for this webContents on success,
      // keyed by event.sender.id (not anything the renderer can spoof).
      if (event?.sender?.id !== undefined) {
        setSession(event.sender.id, { userId: user.user_id, username });
      }

      return { success: true, userId: user.user_id };
    } catch (err) {
      console.error("❌ login-user error:", err.message);
      return { success: false, error: "Service unavailable. Contact administrator." };
    }
  });

  ipcMain.handle("logout-user", async (event) => {
    try {
      if (event?.sender?.id !== undefined) {
        clearSession(event.sender.id);
      }
      return { success: true };
    } catch (err) {
      console.error("❌ logout-user error:", err.message);
      return { success: false, error: "Service unavailable. Contact administrator." };
    }
  });

  // H18: signup-user is no longer open to anyone. It is only permitted when:
  //   (a) the users table is empty (first-run bootstrap — there is no admin
  //       yet, so nobody could be "logged in" to gate this behind), OR
  //   (b) the caller already has an authenticated session (an existing user
  //       adding a colleague).
  // This handler is intentionally NOT wrapped in requireAuth() (which would
  // make bootstrap impossible — you can't log in before any user exists), and
  // instead inlines the "first user OR already authenticated" check itself.
  ipcMain.handle("signup-user", async (event, username, password) => {
    try {
      const countRows = await queryDb(`SELECT COUNT(*) AS count FROM users`);
      const isFirstRun = Number(countRows[0]?.count ?? 0) === 0;

      if (!isFirstRun) {
        const senderId = event?.sender?.id;
        const session = senderId !== undefined ? getSession(senderId) : null;
        if (!session) {
          return {
            success: false,
            error: "You must be logged in to create a new account.",
          };
        }
      }

      // Backend-side password policy (mirrors the frontend's min-length
      // check — kept intentionally simple, no regex zoo).
      if (typeof password !== "string" || password.length < 8) {
        return { success: false, error: "Password must be at least 8 characters." };
      }

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
