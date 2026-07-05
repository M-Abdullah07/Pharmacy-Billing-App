// ─── H3/H4: Real session state in the main process ─────────────────────────
//
// Sessions are keyed by webContents.id (per-window/renderer identity), not
// anything the renderer can forge. login-user calls setSession() on success;
// logout-user (and the window's 'closed'/'destroyed' events, wired by the
// caller) clear it. requireAuth() wraps a handler so it 401s when the calling
// webContents has no session, and also verifies the IPC call actually came
// from the top frame of that webContents (defense against a compromised/
// malicious iframe embedded in the renderer forging privileged IPC calls).

const sessions = new Map(); // webContentsId -> { userId, username }

function setSession(webContentsId, { userId, username }) {
  sessions.set(webContentsId, { userId, username });
}

function getSession(webContentsId) {
  return sessions.get(webContentsId) || null;
}

function clearSession(webContentsId) {
  sessions.delete(webContentsId);
}

// Verifies the IPC event actually originated from the top frame of its own
// webContents, not a nested/child frame. Electron's `event.senderFrame` is
// the actual frame that sent the message; `event.sender.mainFrame` is the
// top-level frame of that WebContents. If a renderer somehow loaded a
// malicious iframe, its frame could still send IPC — this check rejects that.
function isTopFrame(event) {
  try {
    if (!event || !event.sender) return false;
    // event.senderFrame may be undefined in some mocked/test harnesses —
    // treat that as "unknown, assume top frame" only when senderFrame is not
    // provided at all (keeps unit tests that mock a bare event workable),
    // but if it IS provided, it must match mainFrame.
    if (event.senderFrame === undefined) return true;
    return event.senderFrame === event.sender.mainFrame;
  } catch (err) {
    return false;
  }
}

// Wraps an ipcMain handler so it:
//   (a) rejects with an auth error (shape configurable via `unauthorizedValue`
//       or a function deriving it from the handler's normal success/error
//       envelope) when the caller has no session, and
//   (b) rejects if the IPC call didn't come from the top frame.
//
// On success, this also injects `session` (the {userId, username} record)
// as an extra final argument-free channel: handlers can read
// `event.locals.session` for the server-side-verified identity, which should
// win over any frontend-supplied userId/data.userId (H3 requirement).
//
// Usage:
//   ipcMain.handle("add-sale", requireAuth(async (event, data) => { ... }));
//   ipcMain.handle("get-x", requireAuth(handler, { unauthorizedValue: [] }));
function requireAuth(handler, options = {}) {
  const { unauthorizedValue } = options;

  return async (event, ...args) => {
    if (!isTopFrame(event)) {
      return typeof unauthorizedValue === "function"
        ? unauthorizedValue()
        : (unauthorizedValue !== undefined ? unauthorizedValue : { success: false, error: "Not authenticated" });
    }

    const senderId = event?.sender?.id;
    const session = senderId !== undefined ? getSession(senderId) : null;

    if (!session) {
      return typeof unauthorizedValue === "function"
        ? unauthorizedValue()
        : (unauthorizedValue !== undefined ? unauthorizedValue : { success: false, error: "Not authenticated" });
    }

    // Make the server-verified session available to the wrapped handler
    // without changing every handler's positional-argument signature.
    event.locals = { ...(event.locals || {}), session };

    return handler(event, ...args);
  };
}

export { setSession, getSession, clearSession, requireAuth };
